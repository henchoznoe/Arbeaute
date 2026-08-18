# Roadmap V3 — le parcours, les e-mails, et les fondations

## Objectif

La [roadmap v1](ROADMAP.md) a construit les capacités du produit. La
[roadmap v2](ROADMAP-V2.md) a posé les fondations visuelles, remis l’agenda
d’Arzu à l’endroit — sa journée s’affiche dès l’ouverture — et ouvert un
territoire neuf : les e-mails transactionnels.

Cette v3 traite trois sujets, et ils tirent tous dans le même sens : **il ne
doit rester qu’une manière de faire les choses.**

1. **Une seule identité par personne, et un parcours qui la reflète.**
   L’adresse e-mail est demandée juste après la prestation, avant le créneau.
   La fiche est retrouvée côté serveur, sans que l’écran ne révèle jamais si
   une adresse est connue. Et surtout : **plus aucun rendez-vous ne peut
   exister sans adresse**, y compris ceux qu’Arzu saisit elle-même — c’est ce
   qui rend l’identification réellement unique dans son tableau de bord.
2. **Moins d’e-mails, mais tous utiles.** Quatre messages subsistent :
   confirmation, déplacement, annulation, et un bilan de semaine pour Arzu le
   dimanche soir. Les rappels de la veille et le récapitulatif quotidien
   disparaissent. En échange, les messages qui restent portent enfin ce que
   l’écran de confirmation propose déjà, et **un changement décidé par Arzu
   prévient la personne concernée** — aujourd’hui, il ne prévient personne.
3. **Des fondations qui cessent de coûter des contournements.** Les previews
   Vercel écrivent dans la base de production. Deux fichiers n’existent que
   pour amortir ce défaut. Une base Neon dédiée les rend inutiles et rend au
   projet un script de construction ordinaire.

Les trois principes de la v2 restent en vigueur : le téléphone est l’écran
principal, Arzu voit sa journée sans défiler, aucune formulation ne demande
d’explication.

### Décisions prises avant d’écrire ce backlog

| Sujet | Décision |
| --- | --- |
| Ordre du tunnel de réservation | **Prestation → informations → créneau.** L’ordre de ProBook, que l’institut connaît déjà. L’adresse est demandée avant le choix de l’heure. |
| Ce que l’écran montre d’une adresse connue | **Le parcours, jamais les données.** Une adresse connue passe directement au créneau ; une adresse inconnue mène à un second écran (nom, prénom, téléphone). Le serveur ne renvoie **qu’un booléen** : ni nom, ni numéro, ni identifiant ne traversent le réseau, et le récapitulatif n’affiche que l’adresse saisie. Le prix assumé est qu’une adresse saisie reçoit une réponse « connue / inconnue » — strictement moins que `/mes-rendez-vous`, qui donne accès aux rendez-vous, et protégé par la même limite de dix tentatives par quart d’heure. |
| Code à usage unique par e-mail | **Écarté.** `SECURITY.md` le présente comme la suite naturelle, mais il ajoute une étape à des personnes qui n’administrent aucun site. L’adresse seule reste la clé ; le compromis reste documenté. |
| Messages conservés | **Quatre.** Confirmation, déplacement, annulation, bilan du dimanche. **Les rappels de la veille sont supprimés** — la décision est d’envoyer moins. |
| Tâche planifiée | **Une seule, le dimanche soir.** Plus aucun envoi quotidien, ni à la clientèle, ni à Arzu. |
| Envoi lors d’un changement fait par Arzu | **Systématique, sans case à cocher.** Une option que l’on peut oublier de cocher revient à ne pas l’avoir. |
| Previews Vercel | **Base Neon dédiée aux déploiements de preview.** La branche `develop` de Neon disparaît. |
| Ambition générale | **Aucune nouvelle table, aucune migration destructive.** Effort majoritairement S et M ; un seul élément est lourd, et il est surtout d’exploitation. |

### Contraintes permanentes

- Interface et contenus en français `fr-CH`, prix en CHF, fuseau
  `Europe/Zurich`. Les commentaires de code restent en français.
- Une seule praticienne, une seule prestation par rendez-vous.
- Mobile d’abord : toute action principale mesure au moins 44 px, les barres
  fixes réservent la safe area iOS.
- Vercel Hobby et Cache Components : chaque route conserve sa coquille statique.
  Une route publique qui glisse en `ƒ Dynamic` est une régression.
- Les créneaux ne sont **jamais** mis en cache. Les transactions sérialisables
  et la contrainte PostgreSQL `appointment_no_confirmed_overlap` restent
  intactes.
- **Un envoi ne doit jamais bloquer ni faire échouer une mutation.** Toujours
  aucun SMS, aucun paiement en ligne, aucun abonnement payant.
- **Une seule tâche planifiée**, celle que le plan Hobby autorise. Elle passe du
  quotidien à l’hebdomadaire ; elle ne se dédouble pas.
- **Aucun test de bout en bout, aucun navigateur piloté.** La seule suite
  automatisée est Vitest. Règle explicite et non négociable, inscrite dans
  `AGENTS.md`.
- **Le mot « client·e » ne s’écrit pas.** [docs/vocabulaire.md](docs/vocabulaire.md)
  l’a banni après la v2 — l’institut reçoit aussi des hommes — et
  `tests/quality/wording.test.ts` le vérifie sur `app/`, `components/` et
  `lib/`. Ce document suit la même règle : *la personne*, *quelqu’un*, *votre
  clientèle*, *la fiche*.

## Lecture du backlog

**Statuts :** ✅ terminé · 🟡 en cours · ⏳ prêt à démarrer · 🔒 bloqué. Le statut
figure dans le titre et se réévalue après chaque livraison.

### État actuel

| Statut | Éléments |
| --- | --- |
| ✅ Terminés | 1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14 |
| 🟡 En cours | Aucun |
| ⏳ Prêt à démarrer | 4 |
| 🔒 Bloqués | 11 — prémisse invalidée, à repenser (voir l’élément) |

- **Priorité P0** : corrige une friction quotidienne ou prépare plusieurs autres
  éléments.
- **Priorité P1** : gain net une fois les fondations P0 posées.
- **Effort S** : changement localisé ; **M** : plusieurs composants ; **L** :
  évolution transverse, éventuellement avec migration.

**Aucun élément de cette v3 ne demande de migration destructive.** Un seul
touche au schéma, et de façon purement additive.

---

## I. Le parcours de réservation

### 1. Réordonner le tunnel : prestation → informations → créneau — ✅

**Priorité : P0 · Effort : S · Nature : évolution**

**Constat et valeur.** Le tunnel compte quatre étapes — prestation, créneau,
coordonnées, confirmation (`components/reservation/reservation-wizard.tsx:128`).
L’ordre retenu place les coordonnées **avant** le créneau, comme le fait
ProBook, dont l’institut connaît déjà le fonctionnement : prestation, puis une
étape « vos informations », puis l’heure.

Ce que cet ordre apporte concrètement :

- **La dernière étape redevient une pure confirmation.** On ne saisit plus
  rien après avoir choisi son heure : on relit et on valide. C’est le moment où
  quelqu’un veut vérifier, pas taper.
- **Le créneau, seule donnée périssable, est choisi en dernier.** Un créneau
  pris entre le choix et l’envoi oblige aujourd’hui à revenir en arrière de deux
  étapes ; il n’en coûtera plus qu’une, et rien de saisi n’est perdu.

**Livré.** L’ordre est Prestation, Coordonnées, Créneau, Vérification. Les
étapes sont nommées (`STEPS`) plutôt que numérotées, et le fil d’Ariane se
construit sur cette liste au lieu d’une arithmétique d’index.

**« Coordonnées » compte deux écrans pour un seul jalon.** D’abord l’adresse
e-mail, seule. Si une fiche existe, on passe directement au créneau ; sinon, un
second écran demande le nom, le prénom et le numéro. C’est le parcours de
ProBook, et c’est ce que la demande initiale décrivait.

Deux conséquences à connaître :

- **Le commentaire et l’accord ont migré vers la vérification.** C’est le seul
  écran que tout le monde traverse : les laisser sur le formulaire d’identité
  aurait privé les personnes reconnues du premier et fait sauter le second.
- **Le récapitulatif n’affiche pas le nom d’une personne reconnue** — le
  navigateur ne l’a jamais reçu. Il montre l’adresse et une phrase : « Nous
  utilisons les coordonnées déjà enregistrées pour cette adresse. »

Le champ téléphone se remet au format international en le quittant
(`079 123 45 67` devient `+41 79 123 45 67`), et la phrase qui expliquait ce
comportement a disparu : le placeholder `+41791234567` et le champ lui-même le
disent mieux.

Vérifié dans le navigateur, les deux chemins : une adresse inconnue ouvre le
second écran, une adresse connue saute au créneau, et la réservation aboutit
sans que le nom ni le numéro n’aient été ressaisis — la base confirme qu’ils ont
été repris dans la fiche.

**Recommandation initiale.** C’est un réagencement d’interface, et **rien d’autre** —
c’est ce qui le rend court. Aucune action serveur nouvelle, aucune requête
supplémentaire, aucun appel de vérification d’adresse : la fiche continue d’être
retrouvée là où elle l’est déjà, dans l’`upsert` de
`createAppointmentSerializable` (`lib/reservation/appointments.ts:72`). La
validation du formulaire est déjà pure et locale (`lib/reservation/customer-form.ts`).

Les points d’attention, tous dans le même fichier :

- l’effet qui charge la semaine est conditionné à `step !== 2`
  (ligne 269) : le créneau devient l’étape 3 ;
- le retour d’erreur `INVALID_CUSTOMER` renvoie vers `goToStep(3)`
  (ligne 413) : il doit désigner l’étape des informations, où qu’elle soit —
  l’occasion de nommer les étapes plutôt que de les numéroter ;
- le lien direct vers une prestation (`initialServiceId`, ligne 128) doit
  atterrir sur les informations, plus sur le calendrier ;
- le fil d’Ariane cliquable (ligne 517) ne doit jamais permettre de sauter à
  l’étape du créneau sans informations valides.

**Ce que cette décision coûte, et ce qu’elle refuse de coûter.** L’écran répond
« connue / inconnue » à une adresse saisie : c’est inévitable dès lors qu’une
personne connue ne ressaisit rien. Ce qui reste interdit, en revanche, c’est
d’en dire plus. `lookupCustomerByEmail` ne renvoie qu’un booléen ; le nom et le
numéro d’une fiche existante ne quittent jamais le serveur, et le récapitulatif
n’affiche que l’adresse. Un formulaire qui pré-remplirait le nom et le téléphone
serait un annuaire ; celui-ci ne l’est pas.

La recherche n’est jamais bloquante : limite atteinte, origine douteuse ou panne
répondent « inconnue ». Le second écran s’affiche, la réservation aboutit, et la
fiche existante est simplement mise à jour.

**Critères d’acceptation :**

- l’ordre affiché est prestation, informations, créneau, confirmation, et le
  fil d’Ariane le reflète ;
- une adresse connue passe au créneau sans rien ressaisir ; une adresse inconnue
  ouvre le second écran ;
- le serveur ne renvoie qu’un booléen : aucun nom, aucun numéro, aucun
  identifiant ne traverse le réseau, et l’écran n’en affiche aucun ;
- une recherche limitée, refusée ou en panne n’empêche jamais de réserver ;
- un lien direct vers une prestation ouvre l’étape des informations ;
- un créneau devenu indisponible au moment d’envoyer ramène au choix de l’heure
  sans effacer ce qui a été saisi ;
- les champs portent les attributs `autocomplete` qui permettent au navigateur
  de les remplir seul ;
- `/reservation` conserve sa coquille prérendue ;
- le nombre de requêtes par semaine affichée est inchangé.

**Dépendances :** aucune.

### 2. Faire de l’adresse la clé de tout rendez-vous, administration comprise — ✅

**Priorité : P0 · Effort : M · Nature : évolution**

**Constat et valeur.** C’est l’élément qui délivre réellement ce que la
réservation par e-mail vise : **une personne, une fiche, dans le tableau de
bord.**

Une bonne part est déjà acquise, et il faut le savoir avant de chiffrer :
`Customer.emailNormalized` est unique depuis la v1.10
(`prisma/schema.prisma:197`), et **les deux chemins de création rattachent déjà
le rendez-vous à une fiche** — `upsertCustomerIdentity` est appelé aussi bien
par le site public (`lib/reservation/appointments.ts:72`) que par
l’administration (`lib/admin/agenda.ts:429` et `539`).

Ce qui reste ouvert est précis : `appointment.customerId` et
`appointment.customerEmail` sont **nullables**, et le resteront — les
rendez-vous anciens et les fiches effacées en dépendent
(`docs/data-operations.md`). Tant qu’un rendez-vous peut naître sans adresse,
il existe des lignes que rien ne rattache à personne : elles n’apparaissent
dans aucune fiche, ne reçoivent aucun message, et faussent les comptages. Le
formulaire d’administration promet d’ailleurs déjà le contraire de ce qu’il
fait — son message d’erreur annonce que l’e-mail et le téléphone « servent à
envoyer la confirmation », alors qu’aucune confirmation ne part (voir
l’élément 6).

**Livré.** L’essentiel était déjà acquis, et le vérifier faisait partie du
travail : `appointmentSchema` exige l’adresse et le téléphone depuis la v2, et
les deux chemins de création appellent `upsertCustomerIdentity`. Un test le
verrouille désormais — enregistrer sans adresse est refusé, et rien n’est écrit.

Ce qui manquait vraiment, c’est le **signalement des rendez-vous anciens** : le
détail d’un rendez-vous affiche « personne ne sera prévenu si vous le déplacez
ou l’annulez » quand aucune adresse n’est enregistrée, et la fiche marque ces
lignes d’un discret « Sans adresse e-mail ». Une colonne de plus dans le
`select`, aucune requête de plus.

**La fusion de doublons garde un objet, mais plus le même.** La recherche par
`emailNormalized` ne pouvait plus rien trouver — la colonne est unique depuis la
v1.10 — et a été retirée. Restent le téléphone et le nom, qui rapprochent encore
deux fiches légitimement : un couple qui partage un numéro, ou une personne
inscrite sous deux adresses.

**Non fait, et assumé :** la journée de l’agenda ne porte pas ce marqueur. Il
aurait fallu le faire traverser `buildAdminTimelineDay` et la grille de semaine,
pour une information que le détail du rendez-vous donne déjà au moment d’agir.

**Recommandation initiale.** Rendre l’adresse obligatoire **à la création**, des deux
côtés, sans jamais toucher aux colonnes ni aux données existantes :

- côté public, c’est déjà le cas ;
- côté administration, la saisie d’un rendez-vous exige une adresse valide, au
  même titre que le nom. C’est le seul changement de comportement réel ;
- l’écran dit pourquoi, en une phrase qui ne parle pas du modèle de données :
  l’adresse est ce qui permet de retrouver la personne et de la prévenir ;
- les rendez-vous **déjà** dépourvus d’adresse restent tels quels et lisibles.
  Ils sont signalés d’un mot dans la fiche et dans la journée, sans reproche.

Deux garde-fous à ne pas oublier :

- **aucune valeur de remplissage.** Compléter une adresse manquante par une
  adresse générique fusionnerait des personnes distinctes en une seule identité,
  que n’importe qui pourrait ensuite ouvrir depuis « Mes rendez-vous ». La règle
  est déjà écrite dans `docs/data-operations.md` ; elle vaut ici mot pour mot ;
- **la fusion manuelle de doublons** est encore proposée par un message
  d’erreur (`lib/actions/admin-customers.ts:89`). Vérifier si elle a encore un
  objet maintenant que l’adresse est unique, et la retirer si elle n’en a plus :
  une action qui ne peut plus se produire n’a pas à rester à l’écran.

**Critères d’acceptation :**

- un rendez-vous créé depuis l’administration sans adresse valide n’est pas
  enregistré, et l’écran dit pourquoi en une phrase ;
- tout rendez-vous créé après cette livraison porte un `customerId` ;
- les rendez-vous antérieurs sans adresse restent consultables et modifiables,
  et sont signalés sans jugement ;
- aucune colonne ne devient `NOT NULL`, aucune migration destructive ;
- l’effacement des coordonnées d’une fiche continue de fonctionner et écrit
  toujours `NULL` ;
- un test unitaire couvre le refus de création sans adresse, sans base de
  données.

**Dépendances :** aucune ; prépare l’élément 6, qui n’a de sens que si une
adresse est presque toujours là.

### 3. Ouvrir la session juste après la réservation — ✅

**Priorité : P0 · Effort : S · Nature : amélioration**

**Constat et valeur.** L’écran de confirmation se termine par un bouton
« Accéder à mes rendez-vous ». Il mène à un formulaire qui redemande l’adresse
saisie trente secondes plus tôt : `createPublicAppointment` n’ouvre pas de
session (`lib/actions/reservation.ts:204`), alors qu’`identifyCustomer` le fait
à la ligne 269 avec la même fonction, sur la même fiche.

Pour quelqu’un qui n’administre aucun site, se voir redemander une information
que l’on vient de donner est le signe que rien n’a été enregistré.

**Livré.** `createAppointmentSerializable` rend désormais
`{ appointment, customer }` — la fiche est déjà là, l’`upsert` vient de la créer
ou de la retrouver — et l’action ouvre la session juste après.

**Un point vérifié avant d’écrire la ligne :** le trigger
`customer_identity_version_trigger` est un `BEFORE UPDATE`. La valeur
`identityVersion` renvoyée par l’`upsert` est donc déjà incrémentée, et la
session naît valide. Avec un trigger `AFTER`, elle aurait été périmée dès sa
création, et n’aurait échoué que pour les personnes ayant changé de numéro.

Vérifié dans le navigateur : après une réservation, `/mes-rendez-vous` affiche
directement le rendez-vous, sans formulaire d’identification.

**Recommandation initiale.** Appeler `setCustomerSession(customer.id,
customer.identityVersion)` juste après la création. La fiche existe déjà —
l’`upsert` vient de la créer ou de la retrouver — et la fonction existe aussi.

**Sur la sécurité, pour éviter le malentendu :** cela n’affaiblit rien.
L’identification consiste aujourd’hui à saisir une adresse, et la personne vient
de le faire. La session reste de quinze minutes, ne contient aucune coordonnée,
et le trigger `customer_identity_version_trigger` continue de l’expirer dès
qu’une adresse ou un téléphone change.

**Critères d’acceptation :**

- après une réservation, « Accéder à mes rendez-vous » affiche directement le
  rendez-vous qui vient d’être pris ;
- le rendez-vous y est déplaçable et annulable sans nouvelle identification ;
- la session conserve sa durée, son contenu opaque et son invalidation par le
  trigger ;
- un échec de création n’ouvre aucune session ;
- `/mes-rendez-vous` garde sa coquille prérendue et ne bascule pas en dynamique
  complet.

**Dépendances :** aucune ; c’est ce qui donne au retour par e-mail son parcours
« reconnu », que l’élément 1 s’interdit d’offrir sur simple saisie d’adresse.

### 4. Reprendre « Mes rendez-vous » maintenant que l’e-mail existe — ⏳

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** Trois frictions, sur le même écran, qui datent toutes
d’avant les e-mails :

- **Le déplacement repart toujours de zéro.**
  `components/reservation/customer-appointment-card.tsx:100` remet `date` et
  `viewStart` à `minDate` à chaque ouverture du calendrier. Quelqu’un dont le
  rendez-vous est dans trois semaines et qui veut le décaler de deux jours doit
  parcourir trois semaines à la main pour retrouver le sien.
- **L’échec d’identification n’aide pas.** Le message
  (`app/mes-rendez-vous/page.tsx:150`) dit de vérifier l’adresse « telle qu’elle
  a été saisie lors de la réservation ». Cette adresse est désormais imprimée
  dans l’e-mail de confirmation reçu : le message doit y renvoyer.
- **Un déplacement réussi n’annonce pas son e-mail.** La carte affiche le seul
  `result.message`, alors que l’écran de confirmation nomme l’adresse de
  destination via `describeConfirmationDelivery`. Deux écrans, deux traitements
  du même événement.

**Recommandation.** Ancrer le calendrier de déplacement sur la semaine du
rendez-vous en cours plutôt que sur la première date réservable ; renvoyer le
message d’erreur vers l’e-mail reçu ; réutiliser `describeConfirmationDelivery`
après un déplacement et une annulation.

**Critères d’acceptation :**

- ouvrir le calendrier de déplacement montre d’emblée la semaine du rendez-vous
  concerné ;
- décaler d’un jour ne demande aucun changement de semaine ;
- le message d’échec d’identification indique où lire l’adresse exacte ;
- après un déplacement ou une annulation, l’écran annonce le message qui part,
  et n’annonce rien quand rien ne part ;
- le nombre de requêtes par semaine affichée reste inchangé.

**Dépendances :** éléments 5 et 6 pour la cohérence des messages annoncés.

---

## II. Les e-mails : moins nombreux, plus utiles

### 5. Mettre dans l’e-mail ce que l’écran de confirmation propose déjà — ✅

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** L’écran de confirmation propose « Ajouter au calendrier »,
« Copier les détails », « Enregistrer en PDF » et un accès à « Mes rendez-vous ».
Le message reçu, lui, est du texte nu : cinq lignes et une phrase de conclusion
(`lib/email/templates.ts`). Or c’est le message qui survit à la fermeture de
l’onglet — l’écran, non. Et depuis que les rappels disparaissent (élément 7),
c’est **le seul** rappel qui subsiste : il a intérêt à être complet.

Trois manques précis :

- **Pas de fichier calendrier**, alors que `createAppointmentCalendar`
  (`lib/reservation/calendar.ts:48`) produit déjà l’`.ics` consommé par l’écran
  de confirmation et par « Mes rendez-vous », et que Resend accepte les pièces
  jointes.
- **Pas de bouton de retour.** L’adresse de « Mes rendez-vous » est donnée en
  toutes lettres au milieu d’un paragraphe ; `createGoogleCalendarUrl`
  (`lib/reservation/confirmation.ts:26`) existe et n’est pas utilisée.
- **Pas d’adresse de réponse.** `lib/email/client.ts:43` n’envoie pas de
  `reply_to`. Une réponse part donc vers `rendez-vous@arbeaute-bulle.ch`, boîte
  qui ne reçoit rien, pendant que `contact.email` vaut `info@arbeaute.ch`, sur
  un autre domaine, et que le site est `www.arbeaute-bulle.ch`. **Trois adresses
  pour un institut**, dont celle à laquelle on répond spontanément est la seule
  qui n’existe pas.

**Livré.** L’adresse unique retenue est **`info@arbeaute.ch`**, celle qu’Arzu
relève déjà — on ne lui change pas ses habitudes. L’expéditeur devient
`noreply@arbeaute-bulle.ch`, et `reply_to` fait atterrir « Répondre » sur
`info@arbeaute.ch` : aucun renvoi n’a eu à être monté chez l’hébergeur, l’en-tête
suffit. Le pied de page le dit en toutes lettres, pour qui lit l’adresse
d’expédition au lieu d’appuyer sur « Répondre ».

Le `.ics` est joint à la confirmation et au déplacement, jamais à l’annulation —
un rendez-vous annulé n’a plus rien à mettre dans un agenda.
`createCalendarAttachment` (`lib/email/attachments.ts`) renvoie `null` plutôt que
de propager une erreur : un message qui part sans pièce jointe vaut mieux qu’un
message qui ne part pas.

**Un défaut trouvé en chemin, et corrigé.** La confirmation demandait de se
rendre sur « Mes rendez-vous » *« avec l’adresse e-mail et le numéro de téléphone
utilisés lors de la réservation »* — faux depuis la v1.10, où l’adresse seule
identifie. Le message envoyait donc chercher une information devenue inutile.

**Recommandation initiale.** Enrichir les gabarits et l’enveloppe :

- joindre l’`.ics` à la confirmation et au déplacement ;
- ajouter deux boutons — « Ajouter à mon agenda » et « Déplacer ou annuler » —
  construits en **tableau HTML** et non en `<a>` stylé, qu’Outlook ignore ; la
  version texte conserve les mêmes adresses en clair ;
- ajouter `reply_to` à l’enveloppe, ce qui impose de **trancher une adresse
  unique** et d’en faire la seule source dans `lib/constants/contact.ts`. C’est
  une décision d’exploitation autant que de code : la boîte choisie doit être
  relevée.

Les couleurs codées en dur du gabarit HTML ne sont pas une entorse au système
visuel — les variables CSS ne fonctionnent pas dans un client de messagerie —
mais elles doivent reprendre les valeurs des jetons `brand` et être signalées
comme exception dans `docs/systeme-visuel.md`, sinon la prochaine relecture les
prendra pour un oubli.

**Critères d’acceptation :**

- le message de confirmation permet d’ajouter le rendez-vous à un agenda sans
  ouvrir le site ;
- une réponse au message arrive dans une boîte réellement relevée ;
- une seule adresse de contact figure dans tout le projet, e-mails et vitrine
  comprises ;
- les messages restent lisibles en texte brut : chaque bouton a son équivalent
  en adresse écrite ;
- la pièce jointe ne fait pas échouer l’envoi lorsqu’elle est refusée : la trace
  `EmailDelivery` reste juste et le message part quand même ;
- les gabarits restent purs et couverts par des tests, sans I/O ni Prisma.

**Dépendances :** élément 7, livré avant, pour ne pas enrichir un gabarit qui
va disparaître. Débloque les éléments 6 et 8.

### 6. Prévenir la personne à chaque changement décidé par Arzu — ✅

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Les notifications sont câblées **d’un seul côté**. Sur le
site public, `createPublicAppointment`, `moveCustomerAppointment` et
`cancelCustomerAppointment` appellent bien `notifyAppointmentConfirmed`,
`notifyAppointmentRescheduled` et `notifyAppointmentCancelled`
(`lib/actions/reservation.ts`, lignes 204, 395 et 437). Dans l’administration,
`createAdminAppointmentSeries`, `saveAdminAppointment` et
`cancelAdminAppointment` (`lib/actions/admin-agenda.ts`, lignes 262, 313 et 400)
**n’appellent rien du tout**.

Autrement dit : quelqu’un qui annule depuis son téléphone reçoit un message,
mais quand Arzu déplace ce même rendez-vous depuis son agenda, l’intéressé
n’apprend rien. Elle doit encore téléphoner — précisément ce que l’élément 11 de
la v2 devait supprimer. Le formulaire admin promet d’ailleurs déjà ce qu’il ne
tient pas : son message d’erreur annonce que l’e-mail et le téléphone « servent
à envoyer la confirmation ».

**Livré.** Les trois mutations écrivent désormais à la personne concernée.
`saveAdminAppointmentSerializable` remonte l’état précédent
(`{ appointment, previous }`), et `describeAdminAppointmentChange`
(`lib/admin/appointment-notification.ts`) tranche en fonction pure : création,
déplacement, ou rien du tout quand seuls le nom, le téléphone ou le commentaire
ont bougé.

Deux écarts par rapport au texte ci-dessous, tous deux assumés :

- **L’absence d’adresse se dit après l’enregistrement, pas avant.** Le schéma
  admin exige déjà une adresse à la saisie (`lib/actions/admin-agenda.ts:46`) :
  le cas « avant » n’existe donc qu’à l’annulation d’un rendez-vous ancien. Le
  message de résultat le nomme dans tous les cas — « Personne n’a été prévenu :
  ce rendez-vous n’a pas d’adresse e-mail » — ce qui couvre la situation réelle
  au lieu d’une situation théorique.
- **Le message de série ne joint pas de `.ics`.** Y attacher l’agenda d’une seule
  occurrence sur douze induirait en erreur ; un fichier multi-occurrences est un
  travail à part, qui n’a pas été fait.

**Recommandation initiale.** Câbler les trois mutations admin sur les fonctions de
`lib/email/notifications.ts`, qui existent et sont déjà éprouvées. Pas de case à
cocher : l’envoi est systématique dès qu’une adresse est enregistrée. Quatre
nuances, chacune pour une raison :

- **Une série envoie un seul message.** `createAdminAppointmentSeries` peut
  créer douze rendez-vous d’un coup ; douze e-mails à la même personne épuisent
  le quota gratuit et sont pénibles à recevoir. Un nouveau gabarit pur dans
  `templates.ts` liste les occurrences en un message.
- **Une correction de coquille n’écrit à personne.** `saveAdminAppointment` ne
  notifie que si l’horaire ou le soin change. Rectifier l’orthographe d’un nom
  ne doit pas déclencher un « votre rendez-vous a été déplacé ».
- **Les changements de statut restent muets.** Marquer « terminé » ou noter une
  absence (`lib/actions/admin-appointment-status.ts`) n’appelle personne :
  l’information ne demande aucune action.
- **L’absence d’adresse se dit à l’écran.** Le cas devient rare après
  l’élément 2, mais les rendez-vous anciens en gardent : l’écran l’annonce avant
  l’enregistrement, au lieu de laisser croire que la personne sera prévenue.

**Critères d’acceptation :**

- déplacer, annuler ou créer un rendez-vous depuis l’administration envoie le
  message correspondant, sans action supplémentaire d’Arzu ;
- une série de N rendez-vous produit **un** envoi, pas N ;
- modifier uniquement un nom, un téléphone ou un commentaire n’envoie rien ;
- une panne de Resend n’empêche aucune de ces trois mutations et n’allonge pas
  le temps d’enregistrement — l’envoi passe par `after()` comme les autres ;
- l’écran indique, avant enregistrement, si personne ne sera prévenu faute
  d’adresse ;
- chaque décision d’envoyer ou non est couverte par un test unitaire, sans base
  de données.

**Dépendances :** élément 5 pour les gabarits ; élément 2 pour que l’adresse
soit presque toujours présente.

### 7. Supprimer les rappels de la veille et l’envoi quotidien — ✅

**Priorité : P0 · Effort : S · Nature : simplification**

**Constat et valeur.** La tâche quotidienne fait deux choses : elle envoie un
rappel à chaque personne attendue le lendemain, et un récapitulatif à Arzu
(`lib/email/daily-run.ts`). La décision est d’envoyer moins : **les deux
disparaissent.** Arzu ne recevra plus qu’un message par semaine (élément 8), et
la clientèle ne recevra plus que ce qu’elle a déclenché elle-même.

C’est l’élément le plus court du backlog, et il doit être livré tôt : il retire
de la surface que les éléments 5 et 8 auraient sinon à porter.

**Recommandation.** Retirer, dans cet ordre :

- `buildReminderMail` (`lib/email/templates.ts:172`) et ses tests — knip est
  bloquant en intégration continue, un gabarit que plus rien n’appelle fait
  échouer la chaîne ;
- la boucle de rappels de `runDailyEmails`, qui devient le point d’entrée
  hebdomadaire de l’élément 8 ;
- le cron quotidien de `vercel.json`.

**Ce qu’il ne faut surtout pas retirer :** la valeur `APPOINTMENT_REMINDER` de
l’énumération `EmailKind` (`prisma/schema.prisma:49`). Des lignes
`EmailDelivery` la portent déjà ; la supprimer casserait la lecture de
l’historique et serait une migration destructive, exactement ce que ce backlog
s’interdit. Son libellé reste dans `emailKindLabels` (`lib/admin/emails.ts:8`)
pour que `/admin/emails` continue d’afficher le passé. En revanche, un rappel
ne doit plus pouvoir être **renvoyé** : `isResendableKind` (ligne 17) doit
l’exclure au même titre que le récapitulatif.

**Livré.** Ont disparu : `lib/email/daily-run.ts`, la route
`/api/cron/daily-emails`, `vercel.json` en entier — il ne contenait que le cron —
et les gabarits `buildReminderMail` et `buildDailyDigestMail` avec leurs tests.
`formatMailDate` et `formatMailTime` redeviennent privés au module, faute de
lecteur extérieur.

Deux points non prévus par le texte ci-dessus :

- **`CRON_SECRET` a été retiré de `lib/core/env.ts` et de `.env.example`.** Plus
  aucune route ne la lisait : c’était de la configuration morte, et elle faisait
  en outre échouer le build en local, où la variable existe vide — `.optional()`
  ne rattrape pas une chaîne vide, seulement une variable absente. L’élément 8
  la réintroduira avec sa route.
- **`isResendableKind` s’écrit maintenant par liste blanche** plutôt que par
  exclusion : seuls les trois messages de réservation ont encore un gabarit
  capable de les reconstruire.

**Critères d’acceptation :**

- plus aucun envoi n’est déclenché par le passage du temps en semaine ;
- l’historique des rappels déjà envoyés reste lisible dans `/admin/emails`,
  avec son libellé ;
- un rappel passé ne propose plus de bouton de renvoi ;
- aucune migration ; l’énumération `EmailKind` est inchangée ;
- `pnpm knip` passe : aucun gabarit, type ou test orphelin ne subsiste ;
- le quota affiché à `/admin/emails` reste juste malgré la chute du volume.

**Dépendances :** aucune ; précède les éléments 5 et 8.

### 8. Le bilan du dimanche soir — ✅

**Priorité : P1 · Effort : M · Nature : évolution**

**Constat et valeur.** Le seul message qu’Arzu recevra désormais. Il remplace
sept récapitulatifs plats — `10:00 — Nom Prénom — Soin — +41 …` — par un bilan
de la semaine écoulée, envoyé le dimanche soir : ce qui a été fait, ce que cela
représente, et ce qui l’attend.

**Livré.** `vercel.json` renaît avec un unique cron `0 18 * * 0` vers
`/api/cron/weekly-digest`, `CRON_SECRET` revient dans `lib/core/env.ts`, et
`runWeeklyDigest` calcule la semaine **en clés de date locales** — jamais en
« 168 dernières heures », puisque le déclenchement n'est garanti qu'à l'heure
près.

Le message annonce bien du **réalisé** : `buildWeeklySummary` compte les
rendez-vous confirmés dont l'heure est passée, exactement comme `totalVisits`.
L'élément 11 n'était pas nécessaire.

Deux choix à connaître :

- **`WEEKLY_DIGEST` a été ajouté à l'énumération `EmailKind`.** Migration
  purement additive : réutiliser `DAILY_DIGEST` aurait fait afficher « bilan de
  la semaine » sur des envois quotidiens passés.
- **`buildDashboardMetrics` n'a pas été réutilisé**, contrairement à ce que ce
  document annonçait. Il raisonne autour d'une journée d'ancrage et calcule un
  taux d'occupation dont le bilan n'a que faire, au prix de deux requêtes
  d'ouvertures et d'exceptions. `buildWeeklySummary` fait quatre additions, en
  pur et testé.

**Un piège rencontré et refermé pour de bon :** `.env.local` déclarait
`CRON_SECRET=""`, et `.optional()` ne rattrape qu'une variable *absente*, pas
vide — le build échouait. `lib/core/env.ts` traite désormais la chaîne vide
comme une absence, pour toutes les variables facultatives.

**Recommandation initiale.** Une seule tâche planifiée, `0 18 * * 0` dans `vercel.json`,
et une route renommée en conséquence (`/api/cron/weekly-digest`), toujours
protégée par `CRON_SECRET` et exécutée dans `after()` comme aujourd’hui.

**Trois pièges, à traiter dès la conception.**

1. **L’heure sera approximative, et il faut l’assumer.** Les crons Vercel sont
   en UTC et ignorent l’heure d’été : `0 18 * * 0` tombe à 20 h en été et 19 h
   en hiver, et le plan Hobby déclenche à l’heure près, pas à la minute. Rien
   dans le contenu ne doit dépendre d’un horaire exact — en particulier, la
   semaine couverte se calcule par date locale, jamais par « les 168 dernières
   heures ».
2. **« Réalisé » n’est vrai qu’après l’élément 11.**
   `buildDashboardMetrics` (`lib/admin/dashboard-metrics.ts:97`) calcule déjà
   minutes réservées, chiffre, taux d’occupation et absences — en pur, sans
   base : **le bilan le réutilise, il ne recalcule rien.** Mais
   `plannedRevenueCents` porte bien son nom : c’est du **prévu**, issu des
   rendez-vous confirmés. Tant que les journées ne sont pas clôturées
   (élément 11), le bilan doit dire « prévu » et non « réalisé ». Livrer le
   bilan après l’élément 11 lève la nuance.
3. **Trop de chiffres tue le chiffre.** L’élément 12 consiste précisément à
   retirer cinq compteurs d’un écran parce qu’ils ne répondaient à aucune
   question. Le bilan répond à quatre questions, pas davantage : combien de
   personnes reçues, combien d’heures travaillées, quel montant, et ce que
   contient la semaine qui vient. Le reste — comparaison avec la semaine
   précédente, prestations les plus demandées, nouvelles venues — attend d’avoir
   été réclamé.

Deux ajouts qui coûtent peu et servent beaucoup : les absences ne s’affichent
que s’il y en a, et un lien direct vers `/admin` pour la semaine à venir.

**Critères d’acceptation :**

- le message part une fois par semaine, le dimanche soir, et jamais en
  semaine ;
- il répond seul à « combien de personnes, combien d’heures, quel montant » ;
- aucun libellé ne reprend le vocabulaire du modèle de données, et les termes
  retenus rejoignent `docs/vocabulaire.md` ;
- un montant prévu n’est jamais présenté comme réalisé ;
- une semaine vide produit un message court et sans alarme ;
- le gabarit reste pur et testé, sans I/O ni Prisma ; le calcul réutilise
  `buildDashboardMetrics` sans le dupliquer ;
- sans `CRON_SECRET`, la route répond 503 et n’exécute rien — la variable a été
  retirée de `lib/core/env.ts` par l’élément 7 et doit y revenir, avec son entrée
  dans `.env.example` et le cron dans un `vercel.json` recréé ;
- la tâche planifiée reste unique.

**Dépendances :** élément 7 (qui libère la route) et élément 5 (mise en forme
partagée). **Plus l’élément 11** : un chiffre réalisé se compte en rendez-vous
confirmés dont l’heure est passée.

### 9. Afficher le sort d’un e-mail là où la question se pose — ✅

**Priorité : P1 · Effort : S · Nature : amélioration**

**Constat et valeur.** `/admin/emails` présente une liste chronologique de tous
les envois. Ce n’est pas la question qu’Arzu se pose. La sienne est : « est-ce
que la personne de 14 h a bien reçu sa confirmation ? » — et pour y répondre,
elle doit quitter le rendez-vous, ouvrir les réglages, ouvrir les e-mails, puis
retrouver l’adresse dans la liste.

La donnée est pourtant déjà là et déjà indexée : `EmailDelivery` porte
`appointmentId` et un index `[appointmentId, createdAt]`. Seul l’écran de
suivi le lit.

**Livré.** `AppointmentEmailStatus` affiche, sur le détail d’un rendez-vous, les
cinq derniers messages le concernant : leur nature, « Parti » ou « Pas parti », la
date, le destinataire, la phrase actionnable de `describeEmailError`, le détail
technique replié dans un `<details>`, et le bouton de renvoi quand le message
peut être reconstruit. Une requête bornée de plus, servie par l’index
`[appointmentId, createdAt]` qui existait déjà.

**Non fait :** la même ligne sur la fiche. Elle reste possible sans requête par
ligne — un seul `where: { appointmentId: { in: … } }` — mais la question « est-ce
que la personne de 14 h a reçu sa confirmation » se pose devant le rendez-vous,
pas devant la fiche.

**Recommandation initiale.** Porter l’information là où elle est utile : une ligne sur le
détail du rendez-vous et sur la fiche — « Confirmation partie le 18 août à
10:45 », ou « Pas partie », suivie du bouton de renvoi existant. Tout est
réutilisable sans rien réécrire : `describeEmailError`, `formatEmailMoment`,
`emailKindLabels` et `isResendableKind` (`lib/admin/emails.ts`), plus
`EmailResendButton`.

`/admin/emails` garde alors son vrai rôle : la santé des envois et le quota,
pas le suivi individuel.

**Critères d’acceptation :**

- le détail d’un rendez-vous indique si le message est parti, et quand ;
- un échec est formulé en une phrase actionnable, le détail technique restant
  replié ;
- le renvoi fonctionne depuis cet écran comme depuis `/admin/emails`, et
  respecte les exclusions de `isResendableKind` ;
- une requête bornée de plus, aucune requête par rendez-vous dans une liste ;
- aucune nouvelle table, aucune migration.

**Dépendances :** élément 7, dont dépend la liste des types renvoyables.

---

## III. L’agenda et les fiches d’Arzu

### 10. Relier chaque rendez-vous à sa fiche — ✅

**Priorité : P0 · Effort : S · Nature : amélioration**

**Constat et valeur.** La v1 a construit une fiche complète — coordonnées,
historique, notes internes — et **un seul écran y mène** :
`components/admin/admin-search.tsx:328`. Depuis l’agenda, depuis la carte du
prochain rendez-vous, depuis le détail d’un rendez-vous, il n’existe aucun
chemin. Pour savoir si la personne de 14 h est déjà venue, Arzu doit retenir son
nom, ouvrir la recherche et le retaper.

**Livré.** `customerId` traverse maintenant la timeline, et un bouton « Voir la
fiche » apparaît **dans la liste du jour**, à côté du bouton d’appel, et **sur le
détail d’un rendez-vous**. Un rendez-vous ancien sans fiche rattachée n’affiche
rien plutôt qu’un lien mort.

**Deux endroits volontairement laissés de côté :**

- **La carte du prochain rendez-vous.** Elle est *entièrement* un lien ; y
  imbriquer un second lien produirait du HTML invalide, et la sortir en bouton
  séparé coûterait la soixantaine de pixels que l’élément 4 de la v2 avait
  justement gagnée. Elle mène au détail, qui porte le lien.
- **Les cartes de la grille de semaine**, larges de 150 px sur bureau. Elles
  mènent au même détail.

**Recommandation initiale.** Ajouter le lien manquant aux trois endroits. `customerId`
reste nullable pour les rendez-vous antérieurs à l’élément 2 : dans ce cas, ne
rien afficher plutôt qu’un lien mort.

**Critères d’acceptation :**

- ouvrir la fiche depuis un rendez-vous demande un seul appui ;
- un rendez-vous sans fiche rattachée n’affiche pas d’action inerte ;
- le retour ramène à l’écran d’origine, pas systématiquement à la recherche ;
- la cible atteint 44 px et reste atteignable au pouce ;
- aucune requête supplémentaire par ligne dans la liste de la journée.

**Dépendances :** aucune.

### 11. Clôturer les journées passées en un geste — 🔒

**Priorité : P1 · Effort : M · Nature : amélioration**

> **🔒 Bloqué : la prémisse ci-dessous est fausse.**
>
> Vérification faite dans le code : **aucun chemin n’écrit jamais `COMPLETED`.**
> Les seules transitions possibles sont `CONFIRMED ⇄ NO_SHOW`
> (`AdminAppointmentStatusTarget`), et `AppointmentStatusActions` n’offre que
> « Absence » et « Rétablir ». Le bouton « Terminé » n’existe nulle part — la v2
> l’a retiré à dessein : **un rendez-vous confirmé dont l’heure est passée *est*
> une visite réalisée** (`lib/admin/customer-profile.ts:114`).
>
> Il n’y a donc rien à « clôturer ». Le seul geste manuel qui subsiste est de
> noter une absence, et une section listant les rendez-vous passés encore
> confirmés **ne se viderait jamais** : celles et ceux qui sont venus y
> resteraient, puisque leur statut est correct. Elle contredirait son propre
> critère « entièrement masquée quand elle est vide » et deviendrait un rappel
> permanent pour un travail qui n’existe pas.
>
> **Ce qui reste vrai :** une absence non notée reste invisible, et le compteur
> d’absences du tableau de bord reste à zéro. Pour y répondre sans harceler, il
> faudrait marquer les journées déjà passées en revue — une colonne additive,
> donc une migration — ou trouver un autre angle. À décider avant d’écrire.
>
> **Deux éléments s’en trouvent débloqués**, et c’est le gain de cette
> vérification :
>
> - **l’élément 8** peut annoncer un chiffre **réalisé** sans attendre : il se
>   compte en rendez-vous confirmés dont l’heure est passée, comme `totalVisits` ;
> - **l’élément 12** n’a plus de dépendance : la contradiction « Terminé 0 » à
>   côté de « Visites réalisées 12 » vient de ce que `COMPLETED` n’est plus
>   écrit, et c’est exactement ce que la réécriture de l’en-tête fait
>   disparaître.

**Constat et valeur.** Les statuts « terminé » et « absence » existent depuis la
v1 et leurs boutons sont partout depuis la v2 — mais **rien ne rappelle jamais
de les utiliser**. Le résultat se lit dans le code qui a dû s’en accommoder :
`getAdminCustomerProfile` calcule `totalVisits = COMPLETED + pastConfirmedCount`
avec un commentaire qui dit que `COMPLETED` « ne compte plus que les rendez-vous
marqués par l’ancienne interface » (`lib/admin/customer-profile.ts:146`).

Deux conséquences visibles à l’écran : la fiche affiche « Terminé 0 » à côté de
« Visites réalisées 12 », et le compteur d’absences du tableau de bord — un des
quatre indicateurs mis en place par l’élément 18 de la v1 — reste
structurellement à zéro. Une absence non notée est aussi une absence non
facturée et non comptée. C’est également ce qui empêche le bilan du dimanche
(élément 8) de parler d’un chiffre **réalisé**.

**Recommandation.** Une section bornée en tête de `/admin` listant les
rendez-vous encore confirmés dont l’heure est passée, sur une fenêtre de sept
jours, **entièrement masquée quand elle est vide** — l’élément 4 de la v2 a
gagné le droit de voir sa journée sans défiler, et rien ne doit le reprendre.
Les actions y sont celles qui existent déjà (`AppointmentStatusActions`).

**Critères d’acceptation :**

- une journée sans rien à clôturer n’affiche aucune section ;
- la section ne repousse jamais le prochain rendez-vous hors du premier écran à
  360 × 780 px ;
- noter une absence ou une fin depuis cette section confirme visuellement son
  résultat, comme ailleurs ;
- le compteur d’absences du tableau de bord et le total de visites de la fiche
  deviennent cohérents avec ce qui a été noté ;
- la requête reste bornée dans le temps et s’ajoute au `Promise.all` existant :
  aucune requête par jour.

**Dépendances :** aucune ; précède les éléments 8 et 12.

### 12. Réécrire l’en-tête de la fiche autour de ce qu’Arzu cherche — ✅

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** La fiche ouvre sur cinq cartes de comptage :
« Confirmé », « Terminé », « Annulé », « Absence », « Visites réalisées »
(`app/admin/customers/[id]/page.tsx:170`). C’est l’énumération du champ `status`
de la base — exactement ce que l’élément 7 de la v2 a interdit : *aucun écran
n’expose le vocabulaire du modèle de données*. Et tant que l’élément 11 n’est
pas livré, ces cartes se contredisent à l’écran.

Ce qu’Arzu cherche en ouvrant une fiche, c’est autre chose : appeler, savoir
quand la personne est venue la dernière fois, ce qu’elle prend d’habitude, et
si elle revient bientôt.

**Livré.** Les cinq compteurs cèdent la place à quatre réponses — *Visites*,
*Dernière venue*, *Soin habituel*, *Revient* — dérivées de l'historique déjà
chargé, sans une requête de plus. L'appel reste l'action principale. Les
comptages détaillés descendent au contact de l'historique, et les absences ne
s'y affichent que s'il y en a.

**Un défaut attrapé à la relecture d'écran :** le libellé « Ce qu'**elle** prend
d'habitude » présumait une femme — exactement ce que `docs/vocabulaire.md`
interdit depuis que la v2 a banni « client·e ». Devenu « Soin habituel ».

Vérifié à 360 × 780 px : l'en-tête se termine à 540 px, dans le premier écran, et
sans défilement horizontal.

**Recommandation initiale.** Remplacer les cinq compteurs par ces quatre réponses, en
gardant l’appel en action principale — `CustomerCallButton` existe. Les
comptages détaillés ne disparaissent pas : ils descendent avec l’historique,
où ils sont à leur place. Les absences ne s’affichent que s’il y en a : un « 0 »
mis en avant est une accusation gratuite.

**Critères d’acceptation :**

- aucun libellé de la fiche ne reprend un nom de statut de la base ;
- appeler depuis la fiche demande un seul appui ;
- deux chiffres affichés côte à côte ne peuvent pas se contredire ;
- l’en-tête tient dans le premier écran à 360 px sans défilement horizontal ;
- les termes retenus figurent dans `docs/vocabulaire.md`.

**Dépendances :** aucune. L’élément 11 devait « rendre les statuts à nouveau
vrais » ; `COMPLETED` n’étant plus écrit du tout, la réécriture de l’en-tête est
la réponse directe à la contradiction.

---

## IV. Les fondations

### 13. Séparer la base des previews de celle de production — ✅

**Priorité : P0 · Effort : L côté exploitation, S côté code · Nature : dette**

**Constat et valeur.** Les previews Vercel écrivent dans la base de production.
Ce n’est pas un détail d’infrastructure : c’est la cause unique de tout ce que
le projet porte d’inhabituel, et la raison pour laquelle son script de
construction ne ressemble pas à celui d’un projet ordinaire.

Trois conséquences, toutes vérifiables :

- `scripts/migrate-production.ts` neutralise `prisma migrate deploy` hors
  production, sans quoi chaque preview de `develop` fait migrer la base servie
  par `main` — une colonne `NOT NULL` ajoutée par une migration non publiée
  suffit à casser toute réservation ;
- `getAgendaSettings()` avale une exception pour tolérer une table absente
  (`lib/admin/agenda-settings.ts:50`) ;
- une réservation d’essai faite sur une preview crée un **vrai** rendez-vous,
  déclenche de **vrais** e-mails et consomme le quota Resend.

Ces contournements ne sont pas arbitraires — chacun protège des données réelles.
Mais ils traitent le symptôme. À titre de comparaison, BelougaTournament
construit avec `prisma generate && prisma migrate deploy && next build`, sans
garde-fou : non parce que son code est plus propre, mais parce que ses previews
ne partagent pas la base de production.

**Livré.** Côté exploitation : la branche Neon `develop` a été supprimée, la
branche `main` limitée à la portée *Production*, et une base Neon distincte
rattachée à la portée *Preview*. Côté code : `scripts/migrate-production.ts` a
disparu, le script `build` est redevenu
`prisma generate && prisma migrate deploy && next build && verify-build-quality`,
et `getAgendaSettings()` a perdu son `try/catch`.

**Un écart assumé par rapport à BelougaTournament, et il est important.** Le
build de Belouga se termine par `tsx prisma/seed.ts`. Ici, **non** : les `upsert`
de `prisma/seed.ts` portent un `update` complet. Rejoué sur la production, il
réécrirait les prix et descriptions modifiés depuis l’administration, remettrait
`preparationMinutes` et `cleanupMinutes` à zéro et sortirait de l’archive les
prestations archivées. Une base de preview neuve se peuple donc à la main, une
fois. C’est écrit dans `docs/data-operations.md`, avec la commande.

**Recommandation initiale.** Créer dans Neon une base dédiée aux déploiements de
preview et supprimer la branche `develop`, puis, **dans cet ordre** :

1. renseigner les variables de la portée *Preview* dans Vercel — `DATABASE_URL`
   et `DATABASE_URL_UNPOOLED` vers la nouvelle base — et **laisser
   `RESEND_API_KEY` vide en preview** : le code est conçu pour ne rien envoyer
   sans elle, c’est la protection la plus courte et la plus sûre ;
2. appliquer les migrations et le seed une première fois sur cette base ;
3. seulement ensuite, supprimer `scripts/migrate-production.ts` et rendre au
   script `build` sa forme ordinaire ;
4. retirer le `try/catch` de `getAgendaSettings()` et le commentaire qui
   l’explique ;
5. vérifier qu’une preview lit bien la nouvelle base avant de considérer
   l’élément livré.

Trois précautions :

- **`VERCEL_ENV` reste utile** après coup : `app/robots.ts` s’en sert pour
  empêcher l’indexation des previews. Ne pas le retirer de `lib/core/env.ts`.
- **`verify-build-quality.ts` reste** : ce n’est pas un contournement, c’est le
  remplaçant assumé des tests de bout en bout.
- **La règle des migrations en deux temps survit à cette livraison.** Même avec
  des bases distinctes, le build de production migre avant que le nouveau code
  serve : une suppression de colonne part toujours une release après l’ajout
  (`docs/data-operations.md`). Ce qui disparaît, c’est seulement l’obligation de
  tolérer une table absente en preview.

**Critères d’acceptation :**

- un déploiement de preview ne lit ni n’écrit la base de production, et une
  réservation d’essai y est sans conséquence ;
- une migration présente sur `develop` et absente de `main` n’atteint jamais la
  base de production ;
- aucune preview n’envoie d’e-mail ;
- `scripts/migrate-production.ts` et le `try/catch` de `getAgendaSettings()` ont
  disparu, et le script `build` tient sur une ligne lisible ;
- `prisma/seed.ts` peut être rejoué sur la base de preview sans dupliquer de
  données ;
- les previews restent exclues de l’indexation ;
- `pnpm check:com` passe et `docs/data-operations.md` décrit la nouvelle
  répartition des bases.

**Dépendances :** aucune ; à livrer en premier, tout élément ultérieur en
profite.

### 14. Réparer les formats oubliés par la v2, et empêcher la récidive — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat et valeur.** L’élément 13 de la v2 a remplacé onze copies de la mise
en forme des prix par un `formatPrice` unique et quinze constructions de date
par trois gabarits partagés. **Deux écrans y ont échappé** :

- `app/admin/customers/[id]/page.tsx:96` écrit
  `(cents / 100).toLocaleString('fr-CH') + ' CHF'` — le formateur *numérique*,
  celui-là même qui affiche « 75,5 CHF » au lieu de « 75.50 CHF », défaut que la
  v2 dit avoir corrigé ;
- `app/admin/appointments/[id]/page.tsx:179` refait la même chose pour le prix
  et construit sa date avec `dateStyle`/`timeStyle` au lieu du gabarit partagé.

*Correction apportée en cours d’implémentation :* ce document annonçait que la
seconde date produisait la virgule d’ICU. Vérification faite, `fr-CH` rend
« 17 août 2026 à 14:00 » pour cette combinaison — il n’y avait pas de virgule.
Le vrai défaut de cet écran était le prix, et une date construite à la main
plutôt qu’empruntée. Les préréglages `dateStyle`/`timeStyle` restent bannis pour
une autre raison, qui elle tient : ils imposent leur ponctuation ailleurs, et
c’est `normalizeFrenchDate` qui passe ensuite son temps à la défaire.

Ce n’est pas grave en soi. C’est grave que ce soit revenu : la v2 a corrigé
les occurrences sans installer de garde-fou, donc une troisième reviendra.

**Livré.** Le garde-fou a trouvé plus large que les deux écrans annoncés : neuf
fichiers construisaient leur propre formateur, dont **trois copies identiques**
de l’horodatage court de l’administration (`formatActivityCreatedAt`,
`formatAuditCreatedAt`, `formatEmailMoment`) — trois noms pour un seul
comportement, désormais `formatShortMoment`. Les mises en forme manquantes ont
rejoint les modules partagés : `formatDayDate` et `formatShortMoment` dans
`lib/reservation/time.ts`, quatre formateurs de clé de date dans
`lib/reservation/calendar-view.ts`, et `formatCount` dans `lib/utils/format.ts`
pour que plus aucun écran n’ait de raison d’appeler `toLocaleString`.

`tests/quality/formatting.test.ts` tient en trois règles :

1. `Intl.NumberFormat` et `toLocaleString` n’existent que dans
   `lib/utils/format.ts` — un seul module autorisé, ce qui garantit qu’un prix
   passe par `formatPrice` ;
2. aucun écran (`app/`, `components/`) ne construit de formateur de date : la
   couche de mise en forme est dans `lib/` ;
3. `dateStyle` et `timeStyle` ne s’emploient nulle part.

**Recommandation initiale.** Basculer les deux écrans sur `formatPrice` et le
gabarit de date partagé, puis ajouter un test de garde dans `tests/quality/`.
Le patron existe déjà et fonctionne : `tests/quality/wording.test.ts` parcourt
`app/`, `components/` et `lib/` à la recherche d’un terme banni et échoue en
citant fichier et ligne. Le nouveau test cherche `toLocaleString('fr-CH')` et
`new Intl.DateTimeFormat` hors des modules de formatage autorisés
(`lib/utils/format.ts`, `lib/reservation/time.ts`, et les rares modules qui ont
une raison documentée).

**Critères d’acceptation :**

- aucun prix ni aucune date n’est mis en forme ailleurs que dans les modules
  autorisés ;
- le test échoue en nommant le fichier et la ligne fautive, pas seulement en
  disant « non » ;
- la liste des modules autorisés est courte et chaque entrée porte sa raison ;
- le test ne demande ni base de données ni navigateur ;
- `pnpm check:com` passe.

**Dépendances :** aucune ; protège tous les autres éléments.

---

## Ordre de pilotage recommandé

Sans calendrier, mais avec un enchaînement qui évite de refaire deux fois le
même travail. Les quatre premières étapes se tiennent : chacune rend la suivante
moins coûteuse.

1. ~~**13** — la base de preview séparée.~~ ✅ Livré.
2. ~~**14** — le garde-fou de format.~~ ✅ Livré.
3. ~~**7** — supprimer les rappels et le cron quotidien.~~ ✅ Livré.
4. ~~**5**, puis **6** — les gabarits, puis les envois qui s’en servent.~~
   ✅ Livrés. Arzu ne téléphone plus pour annoncer un déplacement.
5. ~~**1**, **2**, **3** — le parcours de réservation.~~ ✅ Livrés ensemble.
6. ~~**10** et **9** — le lien vers la fiche, et le suivi des envois.~~
   ✅ Livrés ensemble. L’élément **11** est bloqué : sa prémisse est fausse.
7. ~~**8** et **12** — le bilan du dimanche et l’en-tête de fiche.~~ ✅ Livrés
   ensemble, les deux que la vérification de l’élément 11 avait débloqués.
8. **4** — la reprise de « Mes rendez-vous », dernier élément ouvert.

**Ce qui reste côté exploitation, et non côté code :**

- ~~créer la base Neon de preview et supprimer la branche `develop`~~ ✅ fait ;
- ~~peupler la base de preview et laisser `RESEND_API_KEY` vide en preview~~
  ✅ fait ;
- **remettre `CRON_SECRET` dans Vercel** : le cron du dimanche est de retour
  dans `vercel.json`, et Vercel réinjecte la variable — vérifier qu'elle est
  bien présente en portée *Production* après le déploiement ;
- terminer la vérification du domaine `arbeaute-bulle.ch` chez Resend, et
  renseigner `RESEND_API_KEY`, `RESEND_FROM` et `ADMIN_NOTIFICATION_EMAIL` dans
  la seule portée *Production* de Vercel ;
- **relever la boîte choisie à l’élément 5** — un `reply_to` vers une adresse que
  personne ne consulte serait pire que pas de `reply_to` du tout.

Chaque livraison conserve les invariants de sécurité, de cache, de fuseau
horaire et de concurrence rappelés en tête de document.
