# Plan de remplacement d’agenda.ch — Août 2026

## 1. Objectif et critères de réussite

Remplacer agenda.ch par un mini-agenda intégré au site Arbeaute avant le vendredi 7 août 2026 (soir).

Le lancement a été avancé du 17 au 7 août. Les rendez-vous agenda.ch à venir sont
reportés manuellement dans le nouveau système au moment du lancement (voir §8).

Le lancement est réussi lorsque :

- Les 34 prestations validées par Arzu sur sa photo de référence sont disponibles dans Neon avec leurs 8 groupes, descriptions, prix, durées, images et visibilité.
- Arzu peut gérer prestations, horaires, indisponibilités et rendez-vous depuis son dashboard.
- Les clients peuvent réserver, retrouver, déplacer et annuler leurs rendez-vous avec leur email et leur numéro de téléphone complet.
- Aucun code de référence, compte client, email ou SMS n’est nécessaire.
- L’interface admin est optimisée pour le téléphone, avec une vue hebdomadaire supplémentaire sur ordinateur.
- Deux opérations concurrentes ne peuvent jamais créer des rendez-vous qui se chevauchent.

## 2. Parcours public

### Réservation

- Remplacer tous les liens agenda.ch du site par `/reservation`.
- Parcours en quatre étapes : prestation, date/créneau, coordonnées, confirmation.
- Une seule prestation par rendez-vous.
- Champs obligatoires : prénom, nom, email et téléphone.
- Commentaire facultatif et consentement explicite à la politique de confidentialité.
- Normaliser l’email en minuscules et le téléphone au format international avec la Suisse comme pays par défaut.
- Départs proposés toutes les 15 minutes dans le fuseau `Europe/Zurich`.
- Réservation entre 12 heures et 3 mois à l’avance.
- Confirmation automatique, sans validation manuelle.
- Page finale avec récapitulatif et téléchargement d’un fichier `.ics`.
- Le fichier `.ics` contient le service, l’horaire, l’adresse et un lien générique vers `/mes-rendez-vous`, sans identifiant secret.

### Identification du client

- Route `/mes-rendez-vous`.
- Demander l’email et le numéro de téléphone complet utilisés lors de la réservation.
- Les deux informations doivent correspondre après normalisation.
- Afficher uniquement les rendez-vous futurs confirmés correspondant exactement à cette paire.
- Créer après validation une session client sécurisée de 15 minutes, dans un cookie `HttpOnly`, `Secure` et `SameSite=Lax`.
- Ne jamais exposer l’existence d’un email ou d’un téléphone avec des messages différents.
- Les rendez-vous admin sans email ou téléphone ne sont pas accessibles en libre-service.

Cette identification reste fondée sur des informations connues, et non sur la possession réelle du téléphone. Le risque est compensé par l’exigence des deux valeurs, la limitation des tentatives et l’absence d’accès aux données historiques.

### Modification et annulation

Le client peut :

- Choisir une nouvelle date et un nouveau créneau.
- Conserver obligatoirement la même prestation.
- Annuler le rendez-vous.
- Télécharger un nouveau `.ics` après déplacement.

Règles :

- Modification et annulation interdites moins de 24 heures avant le rendez-vous.
- Le nouveau créneau doit respecter les horaires, exceptions, disponibilités et limites de réservation.
- La prestation, le prix et les coordonnées ne sont pas modifiables par le client.
- Un changement de prestation ou de coordonnées passe par Arzu.
- Une modification revalide le créneau dans une transaction avant d’être confirmée.
- Un rendez-vous annulé reste dans l’historique mais ne bloque plus le calendrier.
- La session client est supprimée après annulation, déconnexion ou expiration.

## 3. Dashboard admin

### Authentification

- `/admin/login` avec un seul mot de passe défini dans l’environnement.
- Aucun utilisateur Better Auth ni compte en base.
- Session admin de 30 jours dans un cookie signé.
- Bouton de déconnexion visible.
- Rotation du secret de session pour invalider tous les appareils.

### Agenda

- Vue mobile principale : aujourd’hui, prochain jour, liste chronologique et actions rapides.
- Vue desktop : grille hebdomadaire.
- Navigation par date et retour rapide à aujourd’hui.
- Création, déplacement, modification et annulation des rendez-vous.
- Côté admin, seul un nom est obligatoire ; email et téléphone restent facultatifs.
- Si Arzu renseigne email et téléphone, le rendez-vous devient accessible au client dans `/mes-rendez-vous`.
- Création possible hors horaires publics après avertissement.
- Tout chevauchement reste interdit.
- Gestion de blocs d’indisponibilité et d’ouvertures exceptionnelles.

### Prestations et horaires

Arzu peut gérer :

- Nom, groupe, description, durée, préparation et rangement.
- Prix, couleur, ordre, visibilité et état réservable.
- Création, duplication, archivage et réactivation.
- Image de prestation via Vercel Blob.
- Groupes de prestations et leur ordre.
- Horaires hebdomadaires.
- Fermetures et ouvertures exceptionnelles.

Les horaires initiaux restent ceux d’agenda.ch :

- Lundi à mercredi : 08:00–11:30 et 13:30–18:30.
- Jeudi à dimanche : fermé.

## 4. Architecture et données

### Socle technique

Conserver l’application Arbeaute et son design actuel. Reprendre de NexTemplate uniquement Prisma, Zod, les migrations, le seed, les services/actions et Vitest. Ne pas reprendre Better Auth ni ses modèles.

Utiliser :

- Next.js App Router et Server Actions.
- Prisma 7 avec Neon PostgreSQL.
- `DATABASE_URL` poolée à l’exécution et `DATABASE_URL_UNPOOLED` pour Prisma Migrate, conformément à la [documentation Prisma–Neon](https://docs.prisma.io/docs/orm/v6/overview/databases/neon).
- Vercel Blob public pour les images, avec jeton d’upload délivré uniquement à une session admin valide, conformément à la [documentation Vercel Blob](https://vercel.com/docs/vercel-blob/client-upload).
- `libphonenumber-js` pour normaliser et valider les téléphones.
- Composants Tailwind/shadcn personnalisés pour éviter une dépendance de calendrier lourde.

### Variables d’environnement

Ajouter et valider :

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `CUSTOMER_SESSION_SECRET`
- `BLOB_STORE_ID`
- `BLOB_WEBHOOK_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL`

Aucun secret ne doit être exposé au navigateur ou ajouté au dépôt.

### Modèle Prisma

- `ServiceCategory` : nom, description, couleur, ordre et état actif.
- `Service` : identifiant agenda.ch facultatif, groupe, nom, description, durée, préparation, rangement, prix en centimes CHF, couleur, URL Blob, ordre, état réservable, visibilité et archivage.
- `WeeklyAvailability` : jour, début et fin ; plusieurs plages possibles par jour.
- `AvailabilityException` : type ouverture/fermeture, début, fin et libellé.
- `Appointment` : prestation liée, copie figée du nom/prix/durée, début/fin UTC, identité normalisée, commentaire, source, statut et dates d’audit.
- `RateLimitBucket` : clé hachée, action, fenêtre et compteur.

Il n’existe ni table `Customer`, ni compte client, ni référence de réservation.

### Disponibilités et concurrence

- Calculer les créneaux depuis les horaires, exceptions, rendez-vous confirmés et durée totale.
- Stocker toutes les dates en UTC et convertir aux frontières de l’application.
- Conserver les durées à 1 minute demandées ; les heures de départ restent alignées au quart d’heure.
- Créer, déplacer ou annuler dans une transaction PostgreSQL `Serializable`.
- Rechercher les chevauchements dans la transaction et réessayer les conflits de sérialisation.
- Lors d’un déplacement, exclure le rendez-vous courant du contrôle puis réserver atomiquement le nouveau créneau.
- Revalider systématiquement une disponibilité lors de la confirmation.
- Indexer début, fin, statut et paire email/téléphone normalisée.

## 5. Sécurité et anti-abus

- Comparaison du mot de passe admin en temps constant.
- Sessions admin et client signées par des secrets distincts.
- Session client contenant uniquement un digest de l’identité normalisée et une expiration, jamais le téléphone ou l’email en clair.
- Limites initiales :
  - connexion admin : 5 échecs par IP sur 15 minutes ;
  - identification client : 10 essais par IP sur 15 minutes ;
  - réservation publique : 5 créations par IP/email sur une heure ;
  - déplacement/annulation : 10 mutations par session sur une heure.
- Stocker uniquement un hash d’IP dans les compteurs.
- Nettoyer opportunistement les compteurs expirés, sans cron.
- Ajouter validation Zod, honeypot, contrôle d’origine et messages non révélateurs.
- Uploads réservés à l’admin, limités à 5 Mo et aux formats JPEG, PNG et WebP.
- Supprimer l’ancien Blob uniquement après mise à jour réussie de la prestation.
- Ne jamais afficher les rendez-vous passés dans l’espace client.
- Invalider la session client si l’email ou le téléphone du rendez-vous est modifié par Arzu.

## 6. Migration du catalogue

Créer un seed idempotent : relancer l’import ne doit créer aucun doublon.

Importer les 34 prestations et leurs 8 groupes depuis la photo transmise par Arzu, qui fait foi en cas de différence avec agenda.ch. Conserver prix, durées, descriptions, notes tarifaires, couleurs, ordre, visibilité et état réservable.

Inventaire :

- Laser Erbium — 4 prestations.
- Onglerie — 4 prestations.
- Soins visage — 5 prestations.
- Endosphères Therapy — 2 prestations.
- Sourcils & Cils — 6 prestations.
- Épilation au fil — 3 prestations.
- Épilation diélectrique — 1 prestation.
- Épilation laser — 9 prestations.

Conserver la durée à 1 minute de la prestation « Tarif » du groupe Épilation diélectrique, visible mais non réservable.

Télécharger les images existantes, les transférer dans Vercel Blob et supprimer toute dépendance au CDN agenda.ch.

Ne migrer aucun rendez-vous, client ou historique.

## 7. Planning d’exécution

Le planning ci-dessous a été compressé : le lancement est avancé du 17 au 7 août. Les
étapes suivantes sont déjà livrées et validées par la suite de tests Vitest :

### 5–6 août — Fondation, catalogue, parcours client et agenda admin (livré)

- Configuration Prisma/Zod/tests, Neon, schéma, migrations, horaires initiaux.
- Sessions admin et client, protection des routes, limitation des tentatives.
- Catalogue des 34 prestations et 8 groupes migré, images sur Vercel Blob.
- Réservation publique mobile, confirmation, fichier `.ics`, `/mes-rendez-vous`,
  déplacement et annulation à 24 heures.
- Agenda admin (liste mobile, semaine desktop, rendez-vous, horaires, exceptions).

### 6 août — Recette (exécutée, preuves dans RECETTE_RESERVATION_AOUT_2026.md)

- Tests, Prisma, TypeScript, Biome, Knip et build (`pnpm check:com` vert, 41 tests).
- Comparaison automatique des 34 prestations avec la source photo autoritaire.
- Recette fonctionnelle locale (réservation, identification, déplacement, annulation).

### 7 août (matin/midi) — Finalisation UX/UI

- Corriger la navigation publique (lien « Mes rendez-vous » depuis l’accueil, header
  commun aux trois pages publiques) et le retour visuel après annulation/déplacement.
- Vérification de bout en bout en navigateur, mobile et desktop.

### 7 août (après-midi) — Portes manuelles avant production

- Répétition complète avec Arzu sur son téléphone.
- Vérifier sauvegarde/point de restauration Neon, dump Production, dernier déploiement sain.
- Test réservation/identification/déplacement/annulation sur Production avec un
  rendez-vous jetable, puis suppression.
- Épingler le dashboard sur l’écran d’accueil d’Arzu.

### 7 août (soir) — Mise en production

- Déployer la version finale.
- Remplacer tous les liens agenda.ch (déjà fait dans le code — vérifier en production).
- Reporter manuellement les rendez-vous agenda.ch à venir dans le nouveau système.
- Vérifier les parcours depuis téléphone et ordinateur.
- Commencer la période de fonctionnement parallèle.

### 8–21 août — Surveillance

- Contrôler quotidiennement erreurs, collisions et uploads.
- Corriger les défauts sans étendre le périmètre.
- Réconcilier manuellement les deux agendas.
- Exporter une dernière sauvegarde agenda.ch.
- Fermer le mini-site agenda.ch en fin de période.
- Retirer les dernières dépendances et changer les identifiants agenda.ch.

## 8. Fonctionnement parallèle accepté

Jusqu’à la fermeture d’agenda.ch, les deux systèmes pourront recevoir des rendez-vous. Le risque de double réservation est explicitement accepté.

Procédure :

- Le nouveau système devient la référence pour les réservations issues du site Arbeaute.
- Chaque rendez-vous agenda.ch est ajouté au nouveau système comme indisponibilité anonyme.
- Chaque rendez-vous du nouveau système est reporté dans agenda.ch tant qu’il reste utilisé.
- Réconciliation au début, au milieu et à la fin de chaque journée.
- En cas de collision, Arzu contacte rapidement le client grâce au téléphone obligatoire.

## 9. Tests et critères d’acceptation

### Tests automatisés

- Créneaux avec horaires fractionnés, exceptions et fermetures.
- Limites de 12 heures, 3 mois et 24 heures.
- Changements heure d’été/hiver en `Europe/Zurich`.
- Durées de 1, 10, 15, 40, 90 et 120 minutes.
- Deux réservations ou déplacements concurrents.
- Modification d’une prestation déjà réservée.
- Normalisation des emails et téléphones suisses/internationaux.
- Accès avec bonne ou mauvaise paire email/téléphone.
- Expiration et falsification des sessions.
- Déplacement, annulation tardive ou répétée.
- Autorisation et validation des uploads.

### Recette fonctionnelle

- Réserver entièrement depuis un téléphone.
- Télécharger et ouvrir le `.ics`.
- Retrouver plusieurs rendez-vous avec la même paire email/téléphone.
- Déplacer un rendez-vous vers un créneau libre.
- Refuser un déplacement vers un créneau pris.
- Annuler sans exposer les rendez-vous d’une autre personne.
- Créer un rendez-vous admin avec un nom seulement.
- Modifier prix, durée, groupe, description et image.
- Bloquer une demi-journée et vérifier l’absence de créneaux publics.
- Confirmer les 34 prestations, 8 groupes, prix et durées.
- Confirmer qu’aucune image ne dépend encore d’agenda.ch.
- Vérifier qu’un utilisateur non connecté ne peut effectuer aucune mutation admin ou Blob.

## 10. Hypothèses et exclusions

- Mise en production complète : vendredi 7 août 2026 (soir).
- Interface française uniquement.
- Un seul institut, une seule praticienne, un seul fuseau et une seule devise CHF.
- Une seule prestation par rendez-vous.
- Identification par email et téléphone complet, sans référence.
- Le client peut uniquement déplacer ou annuler jusqu’à 24 heures avant.
- Aucun rendez-vous agenda.ch n’est importé.
- Aucun email, SMS, rappel ou notification push.
- Aucun paiement, bon, forfait, statistique ou fichier clients.
- Aucun effacement automatique et aucun cron.
- Les rendez-vous restent conservés jusqu’à anonymisation manuelle.
- Les durées à 1 minute sont conservées.
- Les règles 12 h / 3 mois / 24 h et l’alignement au quart d’heure ne sont pas modifiables dans l’admin initial.
- Le fonctionnement parallèle et son risque de collision sont acceptés.
