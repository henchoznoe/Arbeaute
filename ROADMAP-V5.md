# Roadmap V5 — l’administration dans la main d’Arzu

> **Backlog actif.** Les roadmaps [V1](ROADMAP.md),
> [V2](ROADMAP-V2.md), [V3](ROADMAP-V3.md) et [V4](ROADMAP-V4.md) sont closes.
> Cette V5 concerne exclusivement l’administration. Elle ne modifie ni le site
> vitrine, ni le tunnel de réservation public, ni « Mes rendez-vous ».

## Objectif

L’administration possède déjà toutes les capacités utiles et une charte solide.
Le prochain progrès ne consiste donc pas à ajouter des fonctions, mais à rendre
les gestes d’Arzu plus directs sur son téléphone : voir sa journée, trouver
quelqu’un, ajouter un rendez-vous, répondre à ce qui demande son attention et
changer ponctuellement ses horaires.

Cette V5 vise trois résultats :

1. **La journée avant le tableau de bord.** L’agenda utile doit apparaître avant
   les alertes développées, le prochain rendez-vous global, l’activité et les
   chiffres.
2. **Une action à la fois.** Un écran de saisie ne doit pas montrer d’emblée tous
   ses champs, toutes ses explications et toutes ses options rares.
3. **Des repères qui ne bougent pas.** La navigation mobile garde toujours les
   mêmes cinq entrées, qu’une demande attende ou non.

Le téléphone est l’écran de référence. L’affichage ordinateur reste pris en
charge, mais aucune décision de mise en page ne doit rendre le parcours mobile
plus long ou plus difficile.

## Ce que l’audit montre aujourd’hui

L’audit a été mené le 6 septembre 2026 dans le code et sur l’administration
publiée, avec une session réelle, à **375 × 812 px**. Aucun contenu ni rendez-vous
n’a été modifié.

### Ce qui fonctionne et doit être conservé

- la chronologie journalière est beaucoup plus lisible qu’une grille réduite ;
- la barre du bas donne des cibles tactiles confortables et respecte la safe
  area ;
- les couleurs, rayons, champs, confirmations et retours d’enregistrement sont
  cohérents grâce au système visuel commun ;
- les libellés sont majoritairement concrets et suivent
  [docs/vocabulaire.md](docs/vocabulaire.md) ;
- l’appel, le déplacement, la duplication, les statuts, les demandes de dernière
  minute et les jours particuliers existent déjà ;
- les pages gardent une structure claire au clavier et avec un lecteur d’écran.

### Les frictions encore visibles

- avec une superposition et un prochain rendez-vous affichés, le titre du jour
  arrive tout en bas du premier écran de l’agenda ; aucun rendez-vous de la
  journée n’est encore visible ;
- la navigation passe de cinq à six entrées lorsqu’une demande attend. Le défaut
  de retour à la ligne a été corrigé par la V4, mais les repères changent encore
  au moment le plus urgent et les libellés descendent alors à 10 px ;
- le haut de chaque page répète le nom de la marque, une icône, un titre, une
  longue explication et parfois un bouton avant de montrer la tâche ;
- « Ajouter un rendez-vous » présente une consigne en trois étapes puis un long
  formulaire. Le choix du client et le bouton final sont plusieurs écrans plus
  bas ;
- la fiche d’un rendez-vous affiche deux fois l’action d’appeler et place les
  actions de suivi entre un résumé et le formulaire complet ;
- la fiche d’un nouveau client met quatre cartes en avant, dont « Jamais encore »
  et « Rien d’habituel », avant les informations réellement utiles ;
- la page Réglages affiche six grandes cartes. À 375 px, une carte et demie tient
  dans l’écran ;
- la page des horaires consacre presque la moitié du premier écran à expliquer
  son fonctionnement avant de montrer le calendrier ;
- les 34 prestations restent une longue liste. Les boutons de réorganisation
  sont visibles en permanence, même lorsqu’Arzu veut seulement ouvrir un soin ;
- lors d’une arrivée directe sur une page, le squelette apparaît avant la
  navigation authentifiée : pendant un court instant, l’application perd tous
  ses repères.

## Périmètre et contraintes

- **Administration uniquement :** `app/admin/`, `components/admin/` et la logique
  nécessaire dans `lib/admin/`. Aucune évolution visuelle ou fonctionnelle de la
  vitrine et du parcours public.
- Français `fr-CH`, prix en CHF et fuseau `Europe/Zurich`.
- Une seule praticienne, une seule prestation par rendez-vous.
- Les capacités métier restent les mêmes. L’écran « À traiter » regroupe des
  informations déjà présentes ; il n’introduit aucun nouveau statut.
- Aucune migration de base n’est prévue. Si une proposition finit par en exiger
  une, elle doit être revalidée avant développement.
- Cache Components, transactions sérialisables, protection contre les
  superpositions et absence de cache des créneaux restent intacts.
- Cibles tactiles de **44 × 44 px minimum**, safe area iOS, aucun geste fondé sur
  le survol et aucun défilement horizontal obligatoire.
- Aucun texte d’interface sous **11 px**. La présence de cinq entrées dans la
  barre basse ne doit jamais forcer un texte plus petit.
- Aucun test de bout en bout et aucune capture de référence. Les fonctions
  d’état et de navigation sont testées avec Vitest ; le rendu est vérifié à la
  main dans le navigateur.
- Aucune donnée réelle de la clientèle ne doit entrer dans les fixtures, les
  captures ou la documentation.

## Mesure de réussite

La V5 est terminée lorsque ces cinq scénarios sont confortables avec une seule
main sur un téléphone de 360 px :

1. ouvrir l’administration et voir le premier rendez-vous utile du jour sans
   faire défiler, y compris lorsqu’une chose demande une réponse ;
2. ajouter un rendez-vous depuis le jour choisi sans devoir mémoriser le nom
   exact d’une prestation ;
3. ouvrir un rendez-vous et appeler, déplacer ou noter ce qui s’est passé sans
   traverser le formulaire d’édition ;
4. fermer une date, ajouter une ouverture ou saisir des vacances en comprenant
   immédiatement l’effet produit ;
5. retrouver puis appeler un client sans hésiter sur le sens d’un bouton.

La vérification manuelle couvre au minimum 360 × 780, 375 × 812, 390 × 844 et
430 × 932 px, dans Safari iOS ou la PWA lorsque disponible. À 200 % de zoom,
l’information reste accessible, quitte à défiler verticalement.

## Lecture du backlog

**Statuts :** ✅ terminé · 🟡 en cours · ⏳ prêt à démarrer · 🔒 bloqué ·
❌ abandonné.

| Statut | Éléments |
| --- | --- |
| ✅ Terminés | Aucun |
| 🟡 En cours | Aucun |
| ⏳ Prêts à démarrer | 0 à 10 |
| 🔒 Bloqués | Aucun |
| ❌ Abandonnés | Aucun |

- **Priorité P0** : améliore un geste quotidien ou empêche une erreur.
- **Priorité P1** : améliore un geste fréquent ou un écran important.
- **Priorité P2** : améliore une consultation occasionnelle.
- **Effort S** : changement localisé ; **M** : plusieurs composants ; **L** :
  parcours entier à réorganiser.

---

## I. Valider les repères avant de déplacer les écrans

### 0. Faire une courte recette des gestes réels avec Arzu — ⏳

**Priorité : P0 · Effort : S · Nature : validation**

**Constat.** Le code dit ce que l’administration permet de faire, pas quels
gestes Arzu accomplit réellement le plus souvent ni quels mots elle emploie
spontanément. Une refonte de navigation sans cette vérification risquerait de
remplacer des habitudes qui fonctionnent par une logique théoriquement plus
propre.

**Recommandation.** Avant le premier changement visuel, demander à Arzu
d’accomplir sur son téléphone les cinq scénarios de la section « Mesure de
réussite ». Ne pas lui expliquer l’interface pendant le parcours. Noter seulement
le premier endroit où elle hésite, le mot qu’elle cherche et les écrans qu’elle
n’utilise jamais.

**Critères d’acceptation :**

- la séance dure au plus 20 minutes et utilise les vraies habitudes d’Arzu ;
- aucune donnée personnelle n’est copiée dans le compte rendu ;
- les cinq entrées de navigation proposées à l’élément 1 sont confirmées ou
  corrigées avant leur développement ;
- les constats sont ajoutés à cet élément en quelques lignes, sans transformer
  la roadmap en journal de recherche.

**Dépendances :** aucune ; valide le libellé « À traiter » de l’élément 1.

---

## II. Les repères de l’application

### 1. Garder cinq entrées fixes dans la barre du bas — ⏳

**Priorité : P0 · Effort : M · Nature : refonte de navigation**

**Constat.** `getAdminNavigationEntries` ajoute « Demandes » seulement quand une
demande attend. La barre passe alors de cinq à six entrées, change l’ordre des
repères et réduit ses libellés. « Activité », utile pour vérifier un événement,
occupe en revanche une place permanente alors que ce n’est pas une action
quotidienne.

**Recommandation.** Utiliser exactement cinq entrées, toujours dans le même
ordre : **Agenda · Rechercher · Ajouter · À traiter · Réglages**. « À traiter »
regroupe les demandes de dernière minute, les rendez-vous qui se superposent et,
si le calcul existe déjà au moment de l’implémentation, les e-mails importants
qui ne sont pas partis. Vide, l’écran dit simplement « Tout est en ordre ».

Déplacer « Activité » dans le menu secondaire du haut. Le badge de la barre basse
compte des choses qui demandent une action, jamais des événements seulement
informatifs.

**Critères d’acceptation :**

- les cinq entrées, leur ordre et leur largeur ne changent jamais ;
- chaque libellé tient à 360 px sans passer sous 11 px ;
- « À traiter » reste accessible lorsqu’il n’y a rien en attente ;
- une demande et une superposition ouvrent directement la bonne section ;
- un nombre ne mélange pas une urgence avec l’activité récente ;
- l’état actif reste annoncé visuellement et avec `aria-current`.

**Fichiers principaux :** `lib/admin/navigation.ts`,
`components/admin/admin-navigation.tsx`, `app/admin/page.tsx`, nouvelle page
`app/admin/a-traiter/page.tsx`.

**Dépendances :** élément 0 pour les libellés.

### 2. Alléger le haut de l’écran et rendre le menu explicite — ⏳

**Priorité : P1 · Effort : M · Nature : simplification**

**Constat.** Le bandeau supérieur montre trois boutons sans texte : aide, site et
déconnexion. L’icône de maison double l’accès « Agenda » de la barre basse, et la
flèche de sortie peut vouloir dire revenir, partager ou se déconnecter. Les
en-têtes de page ajoutent ensuite le même surtitre « Arbeauté » et des
descriptions parfois plus longues que la tâche.

**Recommandation.** Sur téléphone, garder le nom Arbeauté et un seul bouton
visuellement nommé **Menu**. Ce menu contient « Activité », « Aide », « Voir le
site » et « Se déconnecter ». La déconnexion garde une confirmation claire. Sur
ordinateur, les accès peuvent rester développés.

Créer une variante mobile compacte d’`AdminPageHeader` : retour, titre, statut ou
action principale. Une explication nécessaire tient en deux lignes au maximum ;
le détail va au contact du champ concerné ou derrière « Bon à savoir ».

**Critères d’acceptation :**

- aucun bouton d’icône du bandeau mobile ne demande de deviner son sens ;
- ouvrir puis fermer le menu conserve le focus et ne fait pas bouger la page ;
- le bouton qui déconnecte dit toujours « Se déconnecter » avant confirmation ;
- le premier contrôle utile de chaque page commence au-dessus de 220 px sur un
  écran de 360 × 780 px, hors message d’erreur ;
- les explications supprimées du haut ne disparaissent pas lorsqu’elles évitent
  réellement une erreur.

**Fichiers principaux :** `components/admin/admin-navigation.tsx`,
`components/admin/admin-page.tsx` et les appels à `AdminPageHeader`.

**Dépendances :** élément 1 pour le contenu du menu.

### 3. Conserver les repères pendant le chargement — ⏳

**Priorité : P1 · Effort : S · Nature : finition**

**Constat.** La navigation authentifiée et son compteur attendent ensemble dans
le même `Suspense`. Lors d’une arrivée directe, l’écran montre un grand squelette
clair avant que le haut et la barre basse apparaissent. La page ressemble un
instant à un document en chargement plutôt qu’à l’application installée d’Arzu.

**Recommandation.** Séparer ce qui vérifie la session de ce qui calcule les
compteurs, ou fournir une coquille mobile fidèle pendant cette attente. Une fois
la session connue, la navigation reste en place pendant les changements de page
et seul le contenu utile affiche son squelette.

**Critères d’acceptation :**

- aucun lien d’administration n’est rendu avant la vérification de session ;
- après identification, le bandeau et la barre basse ne disparaissent plus lors
  d’une navigation interne ;
- une arrivée directe réserve immédiatement leur hauteur et ne provoque aucun
  saut lorsque les compteurs arrivent ;
- les squelettes `agenda`, `form`, `list` et `cards` ressemblent toujours au
  premier écran final correspondant.

**Fichiers principaux :** `app/admin/layout.tsx`, `app/admin/loading.tsx`,
`components/admin/admin-skeleton.tsx`.

**Dépendances :** éléments 1 et 2 pour la nouvelle coquille.

---

## III. Les gestes de tous les jours

### 4. Faire commencer l’agenda par la journée choisie — ⏳

**Priorité : P0 · Effort : M · Nature : refonte d’écran**

**Constat.** L’agenda empile aujourd’hui une alerte de superposition, une alerte
de demande éventuelle, la carte du prochain rendez-vous global, le choix de la
semaine, puis seulement la journée. Sur l’écran observé, le titre du jour arrive
à la limite inférieure du premier écran et aucun rendez-vous n’est visible.

**Recommandation.** Afficher dans cet ordre : titre compact, semaine et jours,
jour choisi, chronologie. Remplacer les alertes développées par une seule ligne
« N choses à traiter » qui ouvre l’écran de l’élément 1. Intégrer l’idée de
« prochain rendez-vous » dans la chronologie du jour avec un repère clair, au
lieu d’une carte séparée au-dessus.

L’activité récente quitte l’agenda. « Votre semaine en chiffres » reste en bas,
repliée sous un bouton explicite ; elle ne concurrence plus la journée.

**Critères d’acceptation :**

- le premier rendez-vous ou l’état vide du jour est visible sans défiler à
  360 × 780 px, même lorsque des choses attendent ;
- le jour choisi et le bouton « Ajouter » restent visibles ensemble ;
- le prochain rendez-vous d’aujourd’hui est distingué dans la chronologie sans
  couleur seule ;
- consulter une autre semaine ou un autre jour conserve les requêtes groupées
  existantes ;
- activité et chiffres restent accessibles, mais après la journée ;
- la grille ordinateur conserve ses jours configurables.

**Fichiers principaux :** `app/admin/page.tsx`,
`components/admin/admin-agenda-view.tsx`,
`components/admin/admin-day-timeline.tsx`,
`components/admin/next-appointment-card.tsx`,
`components/admin/activity-overview.tsx`,
`components/admin/dashboard-metrics.tsx`.

**Dépendances :** élément 1 pour « À traiter », élément 2 pour l’en-tête compact.

### 5. Transformer l’ajout d’un rendez-vous en parcours guidé — ⏳

**Priorité : P0 · Effort : L · Nature : refonte de parcours**

**Constat.** Le formulaire explique d’abord ses trois étapes, puis expose le
soin, la date, l’heure, la répétition, la recherche de client, quatre coordonnées
et le commentaire. Le bouton final est loin du point de départ. Le sélecteur de
prestation reste vide tant que deux caractères n’ont pas été saisis, ce qui
oblige Arzu à se souvenir du nom exact d’un soin.

**Recommandation.** Garder une seule page, mais révéler trois blocs successifs :

1. **Soin** — recherche ou groupes repliables visibles sans saisie ;
2. **Date et heure** — déjà remplies lorsqu’on arrive de l’agenda ;
3. **Client** — choix explicite entre « Client déjà connu » et « Nouveau
   client ».

Chaque bloc terminé devient un résumé court avec un bouton « Modifier ». Les
quatre coordonnées ne s’affichent que pour un nouveau client ou lorsqu’Arzu
choisit de les corriger. « Répéter ce rendez-vous » reste replié jusqu’à ce que
le premier rendez-vous soit complet. L’action finale reste visible juste
au-dessus de la barre basse lorsque les données obligatoires sont valides.

**Critères d’acceptation :**

- une prestation peut être choisie sans clavier et sans connaître son nom exact ;
- un rendez-vous lancé depuis l’agenda reprend le jour choisi ;
- sélectionner un client existant remplace les champs par une carte avec son nom
  et son numéro, sans exposer de données dans l’URL ;
- revenir modifier un bloc ne vide aucun autre bloc valide ;
- le clavier mobile ne masque jamais l’action nécessaire pour continuer ;
- les confirmations « hors ouverture » et « superposition » restent explicites
  et exigent toujours un second geste ;
- l’enregistrement final dit si un e-mail est parti avant le retour à l’agenda ;
- la création simple et la série passent par la même validation serveur
  existante.

**Fichiers principaux :** `components/admin/appointment-form.tsx`,
`components/admin/service-picker.tsx`, `components/admin/customer-picker.tsx`,
`app/admin/appointments/new/page.tsx`.

**Dépendances :** éléments 2 et 4 pour le départ depuis l’agenda.

### 6. Ouvrir un rendez-vous sur ses actions, pas sur son formulaire — ⏳

**Priorité : P0 · Effort : M · Nature : refonte d’écran**

**Constat.** La page est titrée « Modifier le rendez-vous » même lorsque le but
est seulement d’appeler ou de noter une absence. Elle affiche l’action d’appeler
deux fois, un long mode d’emploi, un résumé, les actions de statut puis le
formulaire complet.

**Recommandation.** Titrer la page avec le nom du client et placer immédiatement
la date, l’heure, le soin et le statut. Montrer un seul groupe d’actions :
**Appeler · Déplacer · Noter ce qui s’est passé**. « Dupliquer » et « Modifier les
informations » restent des actions secondaires. Le formulaire complet est fermé
par défaut et s’ouvre depuis « Modifier les informations ».

Les messages envoyés apparaissent après les actions, sous une phrase courte
comme « Confirmation partie à 11:10 ». Les détails techniques restent
consultables, pas prioritaires.

**Critères d’acceptation :**

- appeler, déplacer ou changer le statut est possible dans le premier écran à
  360 px ;
- aucune action n’est dupliquée ;
- l’annulation et le rétablissement gardent leur dialogue de confirmation ;
- ouvrir puis refermer l’édition ne perd aucune modification saisie ;
- une adresse absente est signalée au contact de l’action qui devrait envoyer un
  message ;
- un rendez-vous inactif reste lisible sans afficher de champs désactivés
  inutiles.

**Fichiers principaux :** `app/admin/appointments/[id]/page.tsx`,
`components/admin/appointment-form.tsx`,
`components/admin/appointment-status-actions.tsx`,
`components/admin/appointment-email-status.tsx`.

**Dépendances :** élément 2 pour l’en-tête compact.

### 7. Faire lire le client avant de proposer de le modifier — ⏳

**Priorité : P1 · Effort : M · Nature : simplification**

**Constat.** Les actions rapides sont utiles, mais « Copier » ne dit pas que le
numéro sera copié. Quatre grandes cartes apparaissent ensuite même quand deux
d’entre elles ne contiennent que « Jamais encore » et « Rien d’habituel ». Le
formulaire de coordonnées arrive avant les prochains rendez-vous.

**Recommandation.** Afficher dans cet ordre : nom et actions, prochain
rendez-vous, préférences ou note lorsqu’elles existent, historique. Les chiffres
vides ne prennent pas de carte. Remplacer « Copier » par **Copier le numéro** et
« Ajouter » par **Ajouter un rendez-vous** dans les libellés visibles ou annoncés.

Présenter les coordonnées en lecture seule. Le bouton « Modifier le client »
ouvre le formulaire ; il ne doit plus être l’état normal de la page.

**Critères d’acceptation :**

- appeler ou ajouter un rendez-vous reste possible dans le premier écran ;
- le contenu copié est nommé avant le geste et confirmé après ;
- un prochain rendez-vous apparaît avant les champs d’édition ;
- aucune carte ne met en avant l’absence d’historique ou d’habitude ;
- préférences et note interne restent distinctes et leur confidentialité reste
  expliquée au moment de les modifier ;
- quitter une édition commencée demande confirmation si du texte a changé.

**Fichiers principaux :** `app/admin/customers/[id]/page.tsx`,
`components/admin/customer-profile-controls.tsx`.

**Dépendances :** éléments 2 et 5 pour des actions cohérentes.

---

## IV. Les gestes occasionnels

### 8. Remplacer les grandes cartes de Réglages par une liste courte — ⏳

**Priorité : P1 · Effort : S · Nature : simplification**

**Constat.** Six grandes cartes répètent une icône, un titre, plusieurs lignes de
description et un lien. La page est élégante, mais demande beaucoup de
défilement pour un simple choix de destination.

**Recommandation.** Utiliser des lignes tactiles compactes, groupées avec des
mots du quotidien :

- **Institut :** Horaires, Prestations ;
- **Réservations et messages :** Règles de réservation, E-mails ;
- **Administration :** Affichage de l’agenda, Données.

Chaque ligne porte une icône, un titre, une seule courte phrase et un chevron.
Les six destinations tiennent au plus dans deux écrans de 360 × 780 px.

**Critères d’acceptation :**

- chaque ligne entière est tactile et mesure au moins 56 px de haut ;
- les six destinations restent visibles sans accordéon ni menu caché ;
- aucune description ne dépasse deux lignes à 360 px ;
- « Agenda » devient « Affichage de l’agenda » pour ne pas être confondu avec
  l’agenda quotidien.

**Fichiers principaux :** `app/admin/settings/page.tsx`.

**Dépendances :** élément 2 pour l’en-tête compact.

### 9. Organiser les horaires par intention — ⏳

**Priorité : P1 · Effort : M · Nature : refonte de parcours**

**Constat.** Le calendrier des jours particuliers fonctionne, mais son titre et
son explication repoussent le mois. La semaine habituelle, les vacances,
l’ouverture spéciale et la fermeture partagent le même long écran et un panneau
qui commence par quatre modes concurrents.

**Recommandation.** Séparer clairement **Jours particuliers** et **Semaine
habituelle** avec deux contrôles accessibles, sans défilement horizontal. Dans
« Jours particuliers », proposer trois départs nommés : **Fermer une période ·
Ouvrir exceptionnellement · Ajouter des vacances**. Le formulaire n’affiche que
les champs nécessaires à l’intention choisie.

La semaine habituelle devient une liste de sept lignes. Toucher un jour ouvre ses
heures ; les contrôles de suppression ne restent pas visibles en permanence.

**Critères d’acceptation :**

- le mois ou le résumé de la semaine commence dans le premier écran ;
- les mots « ouverture » et « fermeture » sont toujours visibles, jamais portés
  par la couleur seule ;
- une période de vacances se saisit sans choisir un type technique ;
- modifier un lundi ne fait pas perdre les autres jours ;
- toute suppression reste confirmée lorsqu’elle retire plusieurs dates ou
  heures ;
- les règles de calcul des disponibilités et l’invalidation des tags ne changent
  pas.

**Fichiers principaux :** `app/admin/availability/page.tsx`,
`components/admin/availability-exception-calendar.tsx`.

**Dépendances :** éléments 2 et 8.

### 10. Trouver une prestation sans parcourir les 34 lignes — ⏳

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat.** La V4 a désencombré chaque ligne, mais la page affiche encore huit
groupes et 34 prestations à la suite. Les deux flèches d’ordre restent présentes
sur chaque ligne alors que réorganiser le catalogue est rare.

**Recommandation.** Ajouter une recherche locale par nom et groupe, puis replier
les groupes par défaut sur téléphone. Une recherche ouvre automatiquement les
groupes qui contiennent un résultat. Ajouter un bouton **Changer l’ordre** : les
flèches de groupe et de prestation n’apparaissent que dans ce mode, avec une
action claire pour le quitter.

Ajouter trois filtres simples seulement s’ils sont utiles avec les données
réelles : **Sur le site · Cachées · Mises de côté**. Sans filtre, tout reste
accessible.

**Critères d’acceptation :**

- une prestation se trouve par son nom ou son groupe sans parcourir la page ;
- ouvrir une ligne reste le geste principal hors mode de réorganisation ;
- aucune flèche d’ordre n’apparaît dans le mode normal ;
- entrer puis quitter le mode de réorganisation ne change aucun ordre à lui
  seul ;
- archiver, réactiver, dupliquer et supprimer restent dans le menu secondaire ;
- la recherche est locale et n’ajoute aucune lecture en base.

**Fichiers principaux :** `app/admin/services/page.tsx`,
`components/admin/service-row-actions.tsx`, nouveau composant client de filtrage.

**Dépendances :** éléments 2 et 8.

---

## Ordre de pilotage recommandé

1. **0** — vérifier les mots et les habitudes avec Arzu.
2. **1** — stabiliser les cinq repères et créer « À traiter ».
3. **2**, puis **3** — alléger et stabiliser la coquille commune.
4. **4** — rendre la journée visible dès l’ouverture.
5. **6** — rendre chaque rendez-vous immédiatement actionnable.
6. **5** — reprendre le parcours d’ajout, le plus gros chantier.
7. **7** — aligner la fiche client sur ce nouveau parcours.
8. **8**, puis **9** et **10** — simplifier les écrans occasionnels.

Livrer les éléments 1 à 4 ensemble évite un état intermédiaire où la barre
« À traiter » existe sans que l’agenda sache lui céder ses alertes. Les éléments
5 à 7 forment ensuite un second lot cohérent autour d’un rendez-vous. Les trois
derniers peuvent être livrés séparément.

## Vérification de chaque livraison

Chaque élément passe les contrôles habituels du dépôt, puis une vérification
manuelle mobile :

- `pnpm check` ;
- `pnpm knip` ;
- `pnpm exec tsc --noEmit` ;
- `pnpm test` ;
- `pnpm build` et contrôle des budgets existants ;
- parcours manuel aux quatre largeurs de la section « Mesure de réussite » ;
- parcours au clavier et avec réduction des animations ;
- aucun débordement horizontal, aucune action sous 44 px, aucun texte sous
  11 px et aucun contenu caché derrière la barre basse ou le clavier.

Les tests Vitest doivent viser la logique responsable : entrées de navigation,
compteurs de « À traiter », états du parcours d’ajout, filtrage des prestations
et construction des modes d’horaires. Aucun navigateur automatisé n’est ajouté.

## Écarté de cette V5

- toute modification de la vitrine ou du tunnel public ;
- un mode sombre ou une nouvelle identité visuelle ;
- des statistiques supplémentaires ;
- un CRM, des campagnes, des SMS ou un paiement en ligne ;
- une personnalisation libre du dashboard ;
- le glisser-déposer comme seul moyen de changer un ordre ;
- une nouvelle dépendance lourde pour les menus, les graphiques ou les formulaires ;
- les tests de bout en bout et les captures de référence.

La V5 doit donner l’impression que l’administration contient moins de choses,
alors qu’elle permet exactement les mêmes gestes.
