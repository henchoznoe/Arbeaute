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

## Identification par e-mail seul : livrée en deux temps

Pour mémoire, parce que la règle vaut pour toute suppression future.

Le build Vercel applique les migrations **avant** que le nouveau code serve le
trafic (`scripts/migrate-production.ts`). Une migration qui retire une colonne
encore écrite par le code en ligne casse donc les réservations pendant la fenêtre
de déploiement. La bascule a été découpée en conséquence :

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
