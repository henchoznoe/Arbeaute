# Recette du système de réservation — Août 2026

Ce document conserve les preuves de recette et les opérations manuelles à effectuer avant et après la mise en production du 17 août 2026.

## État au 6 août 2026

### Catalogue autoritaire

- Source fonctionnelle : photo transmise par Arzu, prioritaire sur agenda.ch.
- Catalogue canonique : 34 prestations dans 8 groupes.
- Médias attendus : 32 images migrées dans Vercel Blob et 2 prestations sans image source.
- Vérification répétable : `pnpm db:verify-catalog`.
- La vérification exige toutes les données canoniques, les 32 images Blob et aucune URL runtime agenda.ch.
- Les prestations ou groupes ajoutés ensuite par Arzu sont signalés comme extras, mais ne font pas échouer la recette.

État local constaté : 34 prestations canoniques valides, 8 groupes, 32 images Blob, aucune dépendance image runtime à agenda.ch. La prestation supplémentaire `petite-zone-copie`, créée depuis l’admin, est conservée.

### Base de données et concurrence

- Migrations Prisma déployées sans migration en attente.
- Seed exécuté deux fois sans créer de doublon canonique.
- `pnpm db:verify-concurrency` crée deux rendez-vous simultanés sur le même créneau : un seul gagne, le second reçoit `OVERLAP`, puis toutes les données synthétiques sont supprimées.
- `pnpm db:verify-rate-limit` vérifie le seuil autorisé/autorisé/bloqué et confirme que la clé brute n’est jamais stockée.
- Sauvegarde locale `pg_dump` restaurée avec succès dans une base temporaire : 8 groupes, 35 prestations en incluant la copie admin, historique Prisma complet.
- La base temporaire et le dump de recette ont été supprimés après contrôle.

### Qualité et sécurité

- Tests des horaires fractionnés, exceptions, délais 12 h / 3 mois / 24 h, heure d’été/hiver et durées de 1 à 120 minutes.
- Tests de normalisation email/téléphone, signature, falsification et expiration des sessions.
- Tests de la politique Blob : session admin obligatoire, chemin limité à la prestation, JPEG/PNG/WebP et maximum 5 Mo.
- Test du fichier `.ics` sans identifiant secret dans le lien de gestion.
- `pnpm check:com` est vert : Prisma, Biome, Knip, TypeScript, 41 tests Vitest et build Next.js. Il doit rester vert avant chaque commit de recette ou de mise en production.

### Recette navigateur locale exécutée

- Réservation mobile complète d’une prestation avec consentement.
- Message identique avec une mauvaise paire email/téléphone, puis identification réussie avec email en majuscules et téléphone international normalisés.
- Déplacement refusé après qu’un autre rendez-vous a pris le créneau sélectionné, puis déplacement réussi vers un créneau libre.
- Annulation confirmée en deux étapes, rendez-vous conservé comme annulé avant nettoyage et session client supprimée.
- Fermeture « Vacances » créée par l’utilisateur respectée dans les créneaux publics et visible dans les agendas mobile et desktop.
- Déconnexion admin puis redirection confirmée de `/admin/services` vers `/admin/login`.
- Vue hebdomadaire desktop vérifiée sans erreur ni avertissement dans la console.
- Toutes les données de recette ont été supprimées ; la fermeture « Vacances » et la prestation « Petite zone — copie » ont été préservées.

## Procédure de recette fonctionnelle

À exécuter avec des données synthétiques clairement nommées, puis à nettoyer :

1. Réserver une prestation depuis un écran mobile.
2. Vérifier le récapitulatif et télécharger le fichier `.ics`.
3. S’identifier dans `/mes-rendez-vous` avec la paire email/téléphone exacte.
4. Déplacer le rendez-vous vers un créneau libre.
5. Vérifier le refus d’un créneau déjà occupé.
6. Annuler le rendez-vous avec la confirmation en deux étapes.
7. Vérifier la suppression de la session client et l’absence de rendez-vous passé ou annulé.
8. Créer un rendez-vous admin avec un nom seul.
9. Vérifier la semaine desktop, la liste mobile, les horaires et les exceptions.
10. Vérifier qu’un visiteur non authentifié est redirigé hors des pages admin et ne reçoit aucun jeton Blob.

## Portes manuelles avant production

Ces opérations nécessitent une décision humaine ou concernent directement la production et ne doivent pas être anticipées :

- [ ] Faire une répétition complète avec Arzu sur son téléphone.
- [ ] Vérifier dans le dashboard Neon qu’un point de restauration ou une branche de sauvegarde Production est disponible.
- [ ] Ouvrir sur un téléphone réel le fichier `.ics` téléchargé ; son contenu et l’absence d’identifiant secret sont déjà couverts automatiquement.
- [ ] Exporter un dump Production daté juste avant le déploiement.
- [ ] Noter l’URL du dernier déploiement Production sain dans le journal de lancement.
- [ ] Tester réservation, identification, déplacement et annulation sur Production avec un unique rendez-vous de recette, puis le supprimer.
- [ ] Épingler `/admin` sur l’écran d’accueil du téléphone d’Arzu.

Les variables de connexion créées par l’intégration Postgres sont volontairement masquées par `vercel env pull` sous forme de valeurs de remplacement. La vérification directe de Neon depuis le poste local n’est donc pas utilisée comme preuve ; elle doit être faite depuis le dashboard Neon ou depuis l’environnement Vercel déployé.

## Procédure de rollback Vercel

1. Ne pas modifier la base tant que la cause de l’incident n’est pas comprise.
2. Identifier le dernier déploiement Production sain avec `vercel ls`.
3. Vérifier son statut avec `vercel inspect <url-du-déploiement>`.
4. Restaurer ce déploiement avec `vercel rollback <url-du-déploiement>` uniquement après validation explicite.
5. Rejouer les parcours lecture admin, réservation et espace client.
6. Si une migration incompatible a été appliquée, utiliser le dump ou le point de restauration Neon prévu avant lancement ; ne jamais improviser un rollback SQL destructif.

## Fonctionnement parallèle du 17 au 31 août

- Le nouveau système reçoit les réservations provenant du site Arbeaute.
- Chaque rendez-vous reçu dans agenda.ch est reporté comme indisponibilité anonyme dans le nouvel agenda.
- Chaque rendez-vous du nouvel agenda est reporté dans agenda.ch tant que l’ancien système reste ouvert.
- Réconciliation manuelle au début, au milieu et à la fin de chaque journée.
- Dernier export agenda.ch avant fermeture, puis changement de ses identifiants.
