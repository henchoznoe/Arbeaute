# Données, sauvegarde et restauration

Ces procédures sont réservées à l’environnement local. Elles utilisent le
conteneur PostgreSQL défini par `docker-compose.yml` et ne lisent aucune URL de
production.

## Exports métier

L’écran `/admin/data` diffuse directement trois fichiers CSV UTF-8 au navigateur :

- rendez-vous : filtres facultatifs de début, fin et statut ;
- fiches : coordonnées normalisées courantes et nombre de rendez-vous ;
- catalogue : catégories, prestations, prix, durées et états de publication.

Les fichiers utilisent le point-virgule comme séparateur, contiennent au maximum
10 000 lignes et ne sont jamais enregistrés dans Vercel Blob. Les champs pouvant
être interprétés comme une formule par un tableur sont neutralisés.

## Créer une sauvegarde locale

```bash
pnpm db:up
pnpm db:backup:local
```

La commande affiche le chemin d’une archive PostgreSQL au format custom dans le
dossier ignoré `backups/`. Conserver séparément toute archive nécessaire.

## Vérifier une restauration

```bash
pnpm db:restore:verify -- backups/arbeaute-YYYYMMDDTHHMMSSZ.dump
```

Le script restaure uniquement dans la base jetable
`arbeaute_restore_verify`, contrôle les migrations, prestations et rendez-vous,
puis supprime cette base même en cas d’échec. Il ne peut pas cibler `arbeaute` et
n’accepte pas de chaîne de connexion externe.

Cette vérification prouve que l’archive est lisible ; elle ne remplace pas une
politique de stockage chiffré et de rotation des sauvegardes de production.

## Retirer les condensés d’identité — release suivante

L’identification par e-mail seul est livrée en **deux temps**, et l’ordre n’est
pas négociable.

Le build Vercel applique les migrations **avant** que le nouveau code serve
(`scripts/migrate-production.ts`). Une migration qui supprime une colonne encore
écrite par le code en ligne casse donc les réservations pendant toute la fenêtre
de déploiement. C’est pour cette raison que la version qui bascule
l’identification :

- continue d’écrire `customer.identityDigest` à la création d’une fiche ;
- ne lit plus aucun condensé ;
- ne pose pas encore l’index unique sur `customer.emailNormalized`, et cherche
  donc les fiches avec `findFirst` trié par `firstSeenAt`, jamais avec un
  `upsert` qui produirait un `ON CONFLICT`.

### Ce qui reste indisponible sur une preview

Une preview lit la base de production, qui ne connaît pas encore la table
`agenda_settings` ni la valeur d’énumération `AGENDA_SETTINGS` : l’agenda s’ouvre
et affiche les sept jours, mais **enregistrer** les jours affichés depuis une
preview échoue. Le réglage se teste en local, ou en production après livraison.

### Quand livrer l’étape 2

Une fois la version ci-dessus **en production** — pas seulement fusionnée. Plus
aucun code servi n’écrit alors les colonnes de condensé.

### Avant de livrer

```bash
pnpm db:report-email-duplicates
```

Le rapport liste les fiches qui partagent une adresse : ce sont exactement celles
que la migration va fusionner. Zéro doublon est le cas courant.

### La migration

Créer `prisma/migrations/<horodatage>_email_only_identity/migration.sql` avec le
contenu ci-dessous, puis retirer du schéma Prisma `Customer.identityDigest`,
`Appointment.customerIdentityDigest`, `Appointment.customerIdentityVersion` et
l’index correspondant, et passer `emailNormalized` en `@unique`. Retirer enfin
l’appel à `createCustomerIdentityDigest` dans `lib/reservation/customers.ts` et
la fonction elle-même.

```sql
-- Identification par e-mail seul.
--
-- L'identité d'une fiche reposait sur un condensé HMAC de l'e-mail et du
-- téléphone : deux coordonnées à saisir à la virgule près pour consulter ses
-- rendez-vous. Une seule adresse suffit désormais, ce qui suppose qu'une adresse
-- ne désigne qu'une personne — d'où l'index unique ci-dessous, et la fusion
-- préalable des fiches qui partagent une adresse.
--
-- Le compromis de sécurité est documenté dans SECURITY.md.
--
-- Chaque étape est rejouable : une migration qui touche des données doit pouvoir
-- reprendre après une interruption, comme celle qui a normalisé les fiches.

-- 1. Fusion des fiches partageant une adresse : la plus ancienne survit.
DROP TABLE IF EXISTS customer_merge;
CREATE TEMP TABLE customer_merge AS
WITH ranked AS (
  SELECT
    id,
    "emailNormalized",
    ROW_NUMBER() OVER (
      PARTITION BY "emailNormalized"
      ORDER BY "firstSeenAt" ASC, id ASC
    ) AS position
  FROM "customer"
)
SELECT duplicate.id AS duplicate_id, survivor.id AS survivor_id
FROM ranked AS duplicate
JOIN ranked AS survivor
  ON survivor."emailNormalized" = duplicate."emailNormalized"
  AND survivor.position = 1
WHERE duplicate.position > 1;

-- Notes, préférences et dates de suivi remontent sur la fiche conservée : rien
-- de ce qu'Arzu a écrit ne doit disparaître dans la fusion.
UPDATE "customer" AS survivor
SET
  "internalNote" = left(concat_ws(E'\n\n', survivor."internalNote", merged.notes), 2000),
  "preferences" = left(concat_ws(E'\n\n', survivor."preferences", merged.preferences), 500),
  "firstSeenAt" = least(survivor."firstSeenAt", merged.first_seen),
  "lastSeenAt" = greatest(survivor."lastSeenAt", merged.last_seen)
FROM (
  SELECT
    merge.survivor_id,
    string_agg(duplicate."internalNote", E'\n\n') AS notes,
    string_agg(duplicate."preferences", E'\n\n') AS preferences,
    min(duplicate."firstSeenAt") AS first_seen,
    max(duplicate."lastSeenAt") AS last_seen
  FROM customer_merge AS merge
  JOIN "customer" AS duplicate ON duplicate.id = merge.duplicate_id
  GROUP BY merge.survivor_id
) AS merged
WHERE survivor.id = merged.survivor_id;

-- Les rendez-vous des fiches fusionnées suivent la fiche conservée.
UPDATE "appointment"
SET "customerId" = customer_merge.survivor_id
FROM customer_merge
WHERE "appointment"."customerId" = customer_merge.duplicate_id;

DELETE FROM "customer"
WHERE id IN (SELECT duplicate_id FROM customer_merge);

DROP TABLE customer_merge;

-- 2. Une adresse, une personne.
-- DropIndex
DROP INDEX IF EXISTS "customer_emailNormalized_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "customer_emailNormalized_key" ON "customer"("emailNormalized");

-- 3. Les condensés d'identité ne servent plus : rien ne les lisait, seul le
-- code d'écriture les entretenait.

-- Le rapport d'ambiguïté servait la migration d'août 2026, quand une identité
-- était un condensé de deux coordonnées. Sans condensé, il n'a plus d'objet.
DROP VIEW IF EXISTS "customer_migration_ambiguity_report";

-- Le garde-fou reste entier : toute correction de l'adresse ou du téléphone,
-- même faite directement en base, invalide les sessions déjà ouvertes. Seule la
-- référence au condensé disparaît.
CREATE OR REPLACE FUNCTION bump_customer_identity_version()
RETURNS TRIGGER AS $$
BEGIN
  IF
    OLD."emailNormalized" IS DISTINCT FROM NEW."emailNormalized"
    OR OLD."phoneNormalized" IS DISTINCT FROM NEW."phoneNormalized"
  THEN
    NEW."identityVersion" = OLD."identityVersion" + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DropIndex
DROP INDEX IF EXISTS "appointment_customerIdentityDigest_startsAt_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "customer_identityDigest_key";

-- AlterTable
ALTER TABLE "appointment" DROP COLUMN IF EXISTS "customerIdentityDigest",
DROP COLUMN IF EXISTS "customerIdentityVersion";

-- AlterTable
ALTER TABLE "customer" DROP COLUMN IF EXISTS "identityDigest";
```
