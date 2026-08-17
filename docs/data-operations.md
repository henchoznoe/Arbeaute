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
