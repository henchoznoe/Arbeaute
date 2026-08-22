# Rappel de rendez-vous par e-mail

> **Statut : implémenté et validé le 22 août 2026.**
>
> Ce document décrit le rappel automatique envoyé à la personne qui a pris
> rendez-vous. Il tient compte de l’historique importé depuis agenda.ch, des
> contraintes Vercel, du fonctionnement actuel de Resend et de la règle qui
> détermine jusqu’à quand un rendez-vous peut être changé.

## Décision recommandée en une minute

- Envoyer **un rappel par rendez-vous**, le matin de la veille, avec la date
  exacte dans l’objet et dans le message — jamais seulement « demain ».
- Utiliser un **cron quotidien séparé** du bilan du dimanche. Le plan Vercel
  Hobby permet désormais plusieurs crons par projet, pourvu que chacun ne
  s’exécute pas plus d’une fois par jour.
- Rendre la règle de déplacement et d’annulation **fixe à 24 heures
  calendaires** avant le rendez-vous. Retirer son champ du tableau de bord. La
  règle actuelle de 48 heures ouvrables est difficile à expliquer et peut
  fermer dès le jeudi un rendez-vous du lundi.
- Ajouter le bouton **« Déplacer ou annuler » uniquement si cette action est
  encore possible** au moment où le message est construit. Sinon, inviter à
  répondre à l’e-mail ou à appeler l’institut.
- Ne jamais fabriquer d’adresse pour les anciens rendez-vous importés. Un
  rendez-vous sans e-mail est ignoré proprement et compté comme « sans adresse »
  dans le rapport du passage quotidien.
- Garantir **un seul rappel pour un rendez-vous à un horaire donné**, même si
  Vercel appelle deux fois le cron. Un déplacement vers un nouvel horaire rend
  un nouveau rappel possible.
- Une panne de Resend ne change jamais le rendez-vous. Le rappel est secondaire,
  tracé dans `EmailDelivery`, et peut être retenté automatiquement une fois tant
  que le rendez-vous n’a pas commencé.

## Pourquoi ajouter ce rappel

La confirmation répond à « mon rendez-vous a-t-il bien été pris ? ». Le rappel
répond à une autre question : « quand dois-je venir ? ». Il doit donc arriver
assez près du rendez-vous pour prévenir un oubli, sans devenir une nouvelle
confirmation ni une injonction à modifier le rendez-vous.

La valeur attendue est simple : moins d’oublis, moins d’appels pour retrouver
l’heure et une dernière occasion de signaler un empêchement à Arzu.

### Hors périmètre

- pas de SMS ni de notification push ;
- pas de deuxième rappel le jour même ;
- pas de choix de l’heure du rappel dans le tableau de bord ;
- pas d’option individuelle permettant de désactiver les e-mails
  transactionnels ;
- pas de tâche planifiée externe tant que Vercel suffit ;
- pas de test de bout en bout : Vitest reste l’unique suite automatisée.

## Ce qui existe déjà

Le socle est presque entièrement présent :

- `EmailKind.APPOINTMENT_REMINDER` existe toujours dans Prisma et les anciens
  envois restent lisibles ; aucune nouvelle sorte d’e-mail n’est nécessaire ;
- `deliverEmail()` envoie via Resend, surveille le quota, écrit
  `EmailDelivery` et ne lève jamais d’erreur vers le parcours de réservation ;
- `templates.ts` produit déjà les versions texte et HTML, les boutons, les
  dates `fr-CH`, l’adresse de l’institut et les liens vers
  `/mes-rendez-vous` ;
- `CRON_SECRET` et la vérification de l’en-tête `Authorization` protègent déjà
  la route du bilan hebdomadaire ;
- `Europe/Zurich`, les clés de date locales et les fonctions de mise en forme
  sont centralisées ;
- `Appointment.customerEmail` est volontairement nullable pour préserver les
  anciens rendez-vous et les coordonnées effacées ;
- l’administration exige désormais un e-mail pour toute nouvelle saisie, tout
  comme la réservation publique.

L’ancien rappel supprimé en V3 ne doit pas être restauré tel quel. Il envoyait
simplement les rendez-vous du lendemain, sans protection suffisante contre un
double passage du cron et sans stratégie de rattrapage. Le besoin revient, mais
la nouvelle version doit refermer ces deux défauts.

## Faisabilité sur Vercel

### Réponse technique : oui

État vérifié le **22 août 2026** dans la documentation officielle :

- les Cron Jobs sont disponibles sur tous les plans ;
- Hobby accepte actuellement jusqu’à **100 crons par projet** ;
- chaque expression Hobby peut s’exécuter au maximum **une fois par jour** ;
- un déclenchement Hobby peut arriver n’importe quand dans l’heure demandée
  (`±59 min`) ;
- les expressions sont toujours interprétées en **UTC** ;
- Vercel ne retente pas automatiquement un cron qui échoue ;
- Vercel précise qu’un même événement peut exceptionnellement être livré plus
  d’une fois : la tâche doit être idempotente.

Le cron hebdomadaire actuel et un nouveau cron quotidien peuvent donc
coexister. Il n’est plus nécessaire de les fusionner dans une seule route.

Configuration proposée :

```json
{
  "crons": [
    {
      "path": "/api/cron/appointment-reminders",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 18 * * 0"
    }
  ]
}
```

`05:00 UTC` correspond à 06:00 en hiver et 07:00 en été à Bulle. Avec
l’imprécision Hobby, le passage se fait donc approximativement entre 06:00 et
07:00 en hiver, et entre 07:00 et 08:00 en été. Le message ne promet aucune
heure d’envoi exacte.

Sources : [limites et prix des Cron
Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing), [gestion, sécurité,
absence de retry et
idempotence](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [syntaxe et
fuseau UTC](https://vercel.com/docs/cron-jobs).

### Réserve d’hébergement indépendante du rappel

La faisabilité technique ne règle pas l’éligibilité au plan. Les conditions
Vercel actuelles réservent Hobby à un usage personnel non commercial et citent
la vente ou la promotion d’un service comme usage commercial. Arbeauté est le
site d’un institut qui présente des soins et prend des rendez-vous : il faut
donc considérer le passage à Pro, ou demander une confirmation écrite au
support Vercel. Cette réserve existe déjà aujourd’hui ; le cron de rappel ne la
crée pas.

Sources : [règles d’usage
équitable](https://vercel.com/docs/limits/fair-use-guidelines), [conditions du
plan Hobby](https://vercel.com/legal/terms#4-hobby-plan).

## Quand envoyer le rappel

### Règle nominale

Le passage quotidien du matin traite les rendez-vous confirmés :

1. qui n’ont pas encore commencé ;
2. dont le début tombe au plus tard à la fin de la journée locale suivante ;
3. dont l’adresse e-mail n’est pas vide ;
4. qui n’ont pas déjà reçu un rappel pour **cet horaire précis**.

En fonctionnement normal, cela envoie le rappel le matin de la veille. La
fenêtre inclut aussi le reste de la journée en cours afin de rattraper :

- un échec Resend de la veille ;
- un cron manqué par Vercel ;
- un rendez-vous ajouté ou déplacé après le passage précédent.

Un rendez-vous pris très récemment peut ainsi recevoir une confirmation puis
un rappel rapproché. C’est acceptable si son heure est encore suffisamment
éloignée ; en dessous de **deux heures**, la confirmation ou le message de
déplacement suffit et aucun rappel n’est tenté.

Le gabarit écrit toujours la date complète — par exemple « lundi 24 août 2026 à
14:00 ». Il reste donc vrai lors d’un rattrapage le jour même, contrairement à
« votre rendez-vous, c’est demain ».

### Pourquoi le matin

Avec la recommandation d’un verrou fixe à 24 heures calendaires et les heures
d’ouverture habituelles à partir de 08:00, un envoi vers 06:00–08:00 la veille
laisse normalement encore le temps d’utiliser « Déplacer ou annuler ». Pour un
rendez-vous exceptionnellement placé très tôt, le contenu vérifie la vraie
échéance et retire le bouton s’il est déjà trop tard.

## Jusqu’à quand déplacer ou annuler

### Problème actuel

`customerChangeCutoffHours` est réglable entre 0 et 240 heures. Le calcul
actuel retire des **heures ouvrables** en ignorant samedi et dimanche. Deux
conséquences ne concernent pas seulement le rappel :

- une valeur « 48 » ne signifie pas toujours « deux jours avant » ;
- modifier la valeur aujourd’hui change immédiatement la règle des rendez-vous
  déjà pris, alors que la personne a pu lire une autre promesse au moment de sa
  réservation.

Brancher le rappel directement sur cette valeur rendrait le contenu instable :
un message pourrait annoncer une action encore possible, puis Arzu pourrait
allonger le délai dans le tableau de bord et fermer cette action.

### Recommandation : 24 heures calendaires fixes

Adopter une constante métier de **24 heures réelles avant `startsAt`**, week-end
compris, et retirer le réglage de l’interface.

Avantages :

- « jusqu’à 24 heures avant » signifie la même chose toute l’année ;
- le changement d’heure ne demande aucun traitement spécial : on soustrait 24
  heures à l’instant UTC du rendez-vous ;
- le rappel de la veille est normalement encore actionnable ;
- la règle ne peut plus changer pour les rendez-vous déjà pris ;
- les conditions générales, l’espace personnel et l’e-mail disent exactement
  la même chose.

### Pourquoi 48 heures reste un choix possible, mais non recommandé ici

Une règle fixe à 48 heures calendaires protège davantage l’agenda d’Arzu. En
contrepartie, un rappel envoyé la veille arrive après la fermeture des actions
en ligne. Il doit alors servir uniquement à prévenir un oubli et inviter à
contacter l’institut en cas de problème.

Pour rendre un rappel actionnable avec un verrou à 48 heures, il faudrait
l’envoyer environ trois jours avant. Ce message serait moins proche du
rendez-vous et donc moins bon comme rappel. Le choix entre 24 et 48 heures est
ainsi un choix commercial :

| Règle fixe | Effet pour Arzu | Effet dans le rappel de la veille |
| --- | --- | --- |
| **24 h — recommandée** | Plus de changements tardifs, mais une heure libérée peut encore être proposée sur demande | Bouton généralement encore disponible |
| **48 h** | Agenda mieux protégé contre les changements tardifs | Plus de bouton ; il faut contacter l’institut |

Ne pas conserver le réglage seulement « au cas où ». S’il existe, il faut aussi
garantir la règle promise à chaque rendez-vous, donc enregistrer la valeur sur
chaque rendez-vous. C’est plus de données, de migration et de vocabulaire pour
une souplesse dont Arzu n’a pas exprimé le besoin.

### Retrait sûr du réglage en deux livraisons

La colonne `BookingSettings.customerChangeCutoffHours` ne doit pas disparaître
dans la même livraison que le code qui cesse de l’utiliser : la production
applique les migrations avant de servir le nouveau code.

1. **Livraison A :** introduire la constante fixe, faire lire cette constante à
   toutes les règles publiques, retirer le champ du formulaire et cesser de
   l’écrire. Garder la colonne inutilisée en base.
2. **Livraison B :** supprimer la colonne et son code Prisma maintenant que la
   version en production ne la lit plus.

La fonctionnalité de rappel peut être livrée avec A ; elle n’a pas besoin
d’attendre la suppression physique de la colonne.

## Contenu du message

### Objet recommandé

> Rappel — votre rendez-vous lundi 24 août à 14:00

L’année peut être conservée par le formateur partagé. L’objet ne dépend pas du
mot « demain ».

### Corps recommandé

> Bonjour Marie,
>
> Un petit rappel pour votre rendez-vous chez Arbeauté.
>
> **Soin :** Soins visage — Soin visage bio
>
> **Date :** lundi 24 août 2026
>
> **Heure :** 14:00
>
> **Prix :** 120 CHF
>
> **Adresse :** Place du marché 25, 1630 Bulle

Si le rendez-vous est encore changeable :

> Vous pouvez le déplacer ou l’annuler en ligne jusqu’au dimanche 23 août 2026
> à 14:00.
>
> **[Déplacer ou annuler]**

Sinon :

> Un empêchement ? Répondez à ce message ou appelez-nous dès que possible au
> [numéro de l’institut].

Le message réutilise le pied de page, le lien d’identification par e-mail et les
formateurs actuels. Il ne joint pas de nouveau fichier `.ics` : la confirmation
en a déjà fourni un et une seconde invitation pourrait créer un doublon dans
l’agenda de la personne.

## Garantir qu’un rappel ne part qu’une fois

### Identité d’un rappel

Un rappel est identifié par :

```text
appointment-reminder/<appointmentId>/<startsAt ISO>
```

L’horaire fait partie de la clé :

- deux passages du cron pour le même rendez-vous ne produisent qu’un message ;
- un rendez-vous déplacé vers une nouvelle heure peut recevoir un nouveau
  rappel ;
- revenir plus tard exactement au premier horaire ne renvoie pas le même
  rappel, puisque la personne en a déjà reçu un pour cette heure.

### Protection locale et chez Resend

Ajouter à `EmailDelivery` :

- `deduplicationKey String? @unique` ;
- `appointmentStartsAt DateTime?`, copie de l’heure annoncée ;
- l’état additif `PENDING` dans `EmailStatus` afin d’enregistrer la tentative
  **avant** l’appel réseau.

Le transport accepte ensuite une clé d’idempotence facultative et la transmet
dans l’en-tête `Idempotency-Key` de Resend. Resend déduplique la même requête
pendant 24 heures. La contrainte unique locale reste la vérité durable ; la clé
Resend protège surtout deux exécutions concurrentes ou un timeout ambigu.

Source : [clés d’idempotence
Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

### Cycle d’une tentative

1. Créer atomiquement la ligne `EmailDelivery` en `PENDING` avec sa clé unique.
2. Si cette clé existe déjà en `SENT`, ne rien envoyer.
3. Si elle existe en `FAILED`, autoriser au maximum **une nouvelle tentative**
   lors du passage suivant, tant que le rendez-vous est confirmé et futur.
4. Appeler Resend avec la même clé d’idempotence.
5. Mettre à jour la même ligne en `SENT` ou `FAILED`, son `providerId`, son
   erreur, `sentAt` et `attempts`.
6. Une ligne `PENDING` ancienne est traitée comme une tentative interrompue et
   peut suivre la même règle de reprise. Elle ne doit jamais rester présentée à
   Arzu comme un succès.

L’écran `/admin/emails` distingue alors :

- **En cours** pour `PENDING` ;
- **Parti** pour `SENT` ;
- **Pas parti** pour `FAILED`.

Le rappel reste exclu du bouton manuel « Renvoyer ». Un renvoi plusieurs jours
plus tard pourrait annoncer un rendez-vous passé ou un ancien horaire. Le
rattrapage automatique, limité dans le temps et fondé sur l’heure enregistrée,
est plus sûr.

## Déroulement du passage quotidien

Créer une fonction purement orchestratrice, par exemple
`runAppointmentReminders(now)`, testable avec une horloge injectée.

Pseudo-code :

```text
now = heure réelle du passage
end = fin de demain dans Europe/Zurich
minimum = now + 2 heures

charger en une requête les rendez-vous :
  status = CONFIRMED
  startsAt >= minimum
  startsAt < end
  customerEmail != null

pour chaque rendez-vous, dans l’ordre :
  reconstruire la clé depuis id + startsAt
  réclamer atomiquement cette clé ou décider du retry
  relire status, startsAt et customerEmail avant l’envoi
  si quelque chose a changé : abandonner la tentative
  calculer l’échéance de changement avec la règle fixe
  construire le gabarit avec ou sans bouton
  envoyer avec la clé Resend
  finaliser la ligne EmailDelivery

retourner les compteurs :
  sent, failed, alreadySent, withoutEmail, tooClose, noLongerEligible
```

Les rendez-vous sans e-mail ne doivent pas être chargés pour l’envoi, mais leur
nombre dans la même fenêtre est calculé par un `count` séparé. Ce nombre sert au
rapport du cron et au diagnostic ; il ne crée pas un faux échec dans
`EmailDelivery`, puisqu’aucun envoi n’était possible.

Le volume d’Arbeauté permet des envois séquentiels. Cela évite de faire partir
une rafale et garde le calcul du quota cohérent. Si le volume change un jour,
une petite concurrence bornée pourra être ajoutée sans modifier la règle
métier.

## Cas limites et décision attendue

| Situation | Comportement prévu |
| --- | --- |
| Rendez-vous importé sans e-mail | Aucun envoi, aucun faux échec ; compteur `withoutEmail` et avertissement existant dans la fiche du rendez-vous complété pour mentionner aussi le rappel. |
| E-mail ajouté ensuite à un ancien rendez-vous | Le rendez-vous devient éligible s’il est encore dans la fenêtre ; aucune reprise rétroactive après son début. |
| Coordonnées effacées | `customerEmail = null` : aucun rappel. |
| Rendez-vous annulé, terminé ou noté absent | Exclu : seuls les rendez-vous `CONFIRMED` sont lus. |
| Annulation pendant le passage du cron | Relire juste avant l’envoi. Une course après l’appel réseau reste théoriquement possible ; l’e-mail d’annulation envoyé ensuite corrige la situation. |
| Déplacement avant le rappel | Seul le nouvel horaire est lu. |
| Déplacement après un rappel déjà envoyé | L’e-mail de déplacement corrige immédiatement l’information ; un nouveau rappel est permis pour le nouvel horaire. |
| Plusieurs rendez-vous d’une série | Un rappel par date. La confirmation de série est groupée, mais chaque visite doit être rappelée séparément. |
| Deux rendez-vous le même jour pour la même personne | Deux rappels : ce sont deux soins distincts. Ne pas les fusionner implicitement. |
| Rendez-vous pris la veille | La confirmation part tout de suite ; le passage suivant peut encore envoyer le rappel si le rendez-vous est à plus de deux heures. |
| Rendez-vous accepté depuis une demande de dernière minute | La confirmation d’acceptation suffit s’il reste moins de deux heures ; sinon la règle ordinaire s’applique. |
| Cron déclenché deux fois | La clé unique locale et la clé Resend empêchent le double envoi. |
| Cron manqué ou Resend indisponible | Le passage suivant rattrape une fois si le rendez-vous est encore futur et à plus de deux heures. Vercel, lui, ne fait aucun retry. |
| Changement heure d’été/hiver | Calcul des jours en `Europe/Zurich`, instants stockés en UTC ; aucun calcul en « dernières 24 heures » pour déterminer demain. |
| Déploiement Preview | Aucun cron Vercel n’y est enregistré. Les tests appellent la fonction avec une horloge et une base mockées ; pas d’envoi réel. |
| E-mails non configurés | Rapport `skipped`, aucune promesse côté interface, rendez-vous inchangés. |
| Quota Resend atteint | Ligne `FAILED` et erreur actuelle ; le rendez-vous reste confirmé. |

## Fichiers et changements prévus

### Rappel

- `lib/email/templates.ts`
  - ajouter `buildAppointmentReminderMail` ;
  - recevoir l’échéance facultative de changement ;
  - produire la variante avec bouton ou la variante « contactez-nous ».
- `lib/email/reminder-run.ts`
  - charger la fenêtre locale ;
  - sélectionner, réclamer, retenter et compter les rappels ;
  - relire chaque rendez-vous avant l’envoi.
- `app/api/cron/appointment-reminders/route.ts`
  - vérifier `CRON_SECRET` exactement comme le bilan ;
  - attendre directement la fin du passage et rendre ses compteurs sans
    exposer de données personnelles ;
  - fixer `maxDuration` à 60 secondes. Contrairement à une réservation, aucun
    écran utilisateur n’attend cette route : `after()` n’apporte rien ici et
    masquerait le résultat réel du travail dans la réponse du cron.
- `vercel.json`
  - ajouter `0 5 * * *` sans modifier le bilan du dimanche.
- `lib/email/client.ts`
  - accepter une clé d’idempotence facultative et écrire l’en-tête Resend.
- `lib/email/send.ts`
  - permettre la création préalable puis la finalisation d’une livraison
    identifiée ;
  - conserver le chemin simple actuel pour les autres messages.
- `lib/admin/emails.ts`, `app/admin/emails/page.tsx` et
  `components/admin/appointment-email-status.tsx`
  - présenter correctement `PENDING` ;
  - remettre le rappel dans la liste des messages réellement envoyés ;
  - le laisser hors des renvois manuels.
- `prisma/schema.prisma` et une migration additive
  - ajouter les deux champs de déduplication et `EmailStatus.PENDING` ;
  - conserver `EmailKind.APPOINTMENT_REMINDER` tel quel et actualiser le
    commentaire qui le décrit encore comme un type plus jamais écrit.
- `AGENTS.md` et `ROADMAP-V3.md`
  - ne pas réécrire l’historique de la V3 ;
  - ajouter une note datée indiquant que la décision a été remplacée par ce
    plan et que la limite Vercel d’un seul cron n’est plus actuelle.

### Règle fixe à 24 heures — livraison A

- `lib/reservation/constants.ts`
  - fixer la règle publique à 24 heures calendaires.
- `lib/reservation/time.ts`
  - remplacer le retrait d’heures ouvrables par une soustraction d’heures
    réelles ;
  - garder une seule fonction partagée par l’espace personnel et l’e-mail.
- `lib/reservation/appointments.ts`, `lib/actions/reservation.ts`,
  `app/mes-rendez-vous/page.tsx`, `app/conditions-generales/page.tsx` et
  `lib/reservation/booking-window.ts`
  - ne plus lire une valeur mutable pour autoriser ou décrire le changement.
- `app/admin/settings/booking/page.tsx`, `lib/admin/booking-settings.ts`,
  `lib/reservation/booking-settings.ts` et les libellés d’audit
  - retirer le champ de l’interface et cesser de l’écrire ;
  - garder temporairement la colonne Prisma.

### Règle fixe — livraison B

- migration supprimant `BookingSettings.customerChangeCutoffHours` ;
- retrait du champ restant dans le schéma Prisma et des compatibilités
  temporaires ;
- mise à jour de `docs/data-operations.md` avec la séquence réellement livrée.

## Tests unitaires

### Gabarit

- date, heure, soin, prix et adresse utilisent les formateurs partagés ;
- texte et HTML contiennent le bouton quand l’échéance est future ;
- texte et HTML invitent à contacter l’institut quand elle est passée ;
- aucun `.ics` n’est joint ;
- nom et libellé de soin sont échappés en HTML ;
- le sujet reste exact lors d’un envoi le jour même.

### Sélection et temps

- un rendez-vous de demain est sélectionné ;
- un rendez-vous déjà commencé, trop proche, trop lointain ou annulé ne l’est
  pas ;
- la fenêtre reste correcte au passage à l’heure d’été et à l’heure d’hiver ;
- 24 heures calendaires donnent le même instant limite le week-end ;
- l’action est refusée exactement à l’échéance, comme aujourd’hui.

### Déduplication et reprise

- deux passages identiques produisent un seul appel Resend ;
- deux exécutions concurrentes ne réclament qu’une clé ;
- un `FAILED` est retenté une seule fois ;
- un `SENT` ne repart jamais ;
- un déplacement change la clé ;
- une annulation entre la sélection et la relecture empêche l’envoi ;
- la même clé est transmise à Resend lors du retry ;
- une adresse absente augmente `withoutEmail` sans créer de livraison.

### Route

- 503 sans `CRON_SECRET` ;
- 401 avec un mauvais secret ;
- aucun détail personnel dans la réponse ;
- aucun navigateur, capture d’écran ou base réelle.

## Vérification manuelle avant production

1. Lancer la fonction avec une horloge fixée avant un changement d’heure et
   vérifier les dates sélectionnées.
2. Créer quatre rendez-vous de test : avec e-mail, sans e-mail importé, annulé,
   et déplacé après un premier rappel.
3. Appeler la route deux fois avec le bon secret et vérifier un seul message
   dans Resend pour le même horaire.
4. Forcer un refus Resend, vérifier `FAILED`, puis le retry unique.
5. Vérifier `/admin/emails` et la section « Messages envoyés » du rendez-vous.
6. Vérifier les variantes avec et sans bouton dans un client e-mail sur mobile.
7. Contrôler dans Vercel que les deux crons apparaissent après le déploiement et
   que la route quotidienne est appelée dans l’heure attendue.
8. Exécuter `pnpm check:com`.

## Critères d’acceptation

- chaque rendez-vous confirmé avec une adresse reçoit au plus un rappel par
  horaire ;
- le rappel nominal part le matin de la veille, sans promesse à la minute ;
- un rendez-vous importé sans adresse ne fait échouer ni le cron ni le quota ;
- annuler avant le passage empêche le rappel ;
- déplacer après un rappel envoie le message de déplacement et autorise un
  rappel pour la nouvelle heure ;
- le bouton de changement n’apparaît jamais après la vraie échéance ;
- la règle affichée dans les conditions générales, l’espace personnel et le
  rappel est la même ;
- une double invocation ne produit pas deux e-mails ;
- une panne Resend ne modifie jamais un rendez-vous ;
- le bilan du dimanche continue de partir indépendamment ;
- les routes publiques conservent leur coquille statique ;
- Prisma, Biome, knip, TypeScript, Vitest et le build passent.

## Validations acquises avant de coder

1. **Règle fixe à 24 heures calendaires : acceptée.**
2. **Rappel le matin de la veille, approximativement 06:00–08:00 : accepté.**

Le reste du plan ne demande pas de choix produit supplémentaire.
