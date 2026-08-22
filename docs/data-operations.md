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

## Une base par environnement

La branche Neon `main` est réservée à la portée *Production* de Vercel ; une base
Neon distincte sert la portée *Preview*. Chaque déploiement migre donc la sienne,
et le script `build` est redevenu ordinaire :

```
prisma generate && prisma migrate deploy && next build && verify-build-quality
```

Avant cette séparation, les previews lisaient et écrivaient la base de
production. Deux contournements existaient pour l’amortir — un script qui
neutralisait `prisma migrate deploy` hors production, et une lecture qui absorbait
l’absence d’une table dans `getAgendaSettings()`. Les deux ont été supprimés.

**Le seed ne fait volontairement pas partie du build.** `prisma/seed.ts` est
idempotent, mais ses `upsert` portent un `update` complet : le rejouer sur la
production réécrirait les prix et descriptions modifiés depuis l’administration,
remettrait `preparationMinutes` et `cleanupMinutes` à zéro et sortirait de
l’archive les prestations archivées. Une base de preview neuve se peuple donc à
la main, une fois :

```bash
DATABASE_URL="<chaîne de la base de preview>" pnpm db:seed
```

## Identification par e-mail seul : livrée en deux temps

Pour mémoire, parce que la règle vaut pour toute suppression future — **elle
survit à la séparation des bases**, puisque la production migre toujours avant
de servir.

Le build Vercel applique les migrations **avant** que le nouveau code serve le
trafic. Une migration qui retire une colonne encore écrite par le code en ligne
casse donc les réservations pendant la fenêtre de déploiement. La bascule a été
découpée en conséquence :

1. **v1.10.0** — le code cesse de lire les condensés, continue d’écrire
   `customer.identityDigest` à la création, et cherche les fiches sans dépendre
   d’un index unique qui n’existe pas encore. Migration purement additive.
2. **`20260818003000_email_only_identity`** — une fois la v1.10.0 en production :
   fusion des fiches partageant une adresse (les rendez-vous suivent la fiche
   conservée, aucun n’est supprimé), index unique sur `customer.emailNormalized`,
   suppression de `customer.identityDigest`, des deux colonnes de condensé de
   `appointment`, de la vue `customer_migration_ambiguity_report` et de la
   référence au condensé dans le trigger `customer_identity_version_trigger`.

Avant de livrer une migration de fusion, le rapport en lecture seule dit ce
qu’elle va toucher :

```bash
pnpm db:report-email-duplicates
```

`customerEmail` et `customerPhone` de `appointment` restent nullables pour
toujours : l’effacement des coordonnées y écrit `NULL`. Les rendez-vous anciens
sans téléphone ne doivent pas être « complétés » par une valeur de remplissage —
une adresse partagée fusionnerait des personnes distinctes en une seule identité,
que n’importe qui pourrait ouvrir depuis « Mes rendez-vous ».

## Délai de changement fixe : retrait en deux temps

La livraison du rappel du 22 août 2026 fixe le déplacement et l’annulation à 24
heures calendaires. Le code, les conditions générales et l’administration ont
cessé de lire et d’écrire `BookingSettings.customerChangeCutoffHours`, mais la
colonne reste volontairement dans le schéma de cette première livraison.

Après mise en production de cette version, une seconde livraison pourra retirer
la colonne avec une migration dédiée. La migration ne doit pas être ajoutée à la
première : Vercel l’appliquerait alors pendant que l’ancienne version en ligne
lit encore ce champ.
