# Roadmap V4 — les écrans, tels qu’on les voit sur un téléphone

## Objectif

La [roadmap v1](ROADMAP.md) a construit les capacités du produit. La
[roadmap v2](ROADMAP-V2.md) a posé les fondations visuelles. La
[roadmap v3](ROADMAP-V3.md) a réordonné le tunnel, réduit les e-mails à ce qui
sert, et séparé la base des previews de celle de production. Les trois sont
closes.

Depuis, deux livraisons non publiées — « late booking » phases 1 et 2 — ont
ajouté les demandes de dernière minute, quatre gabarits d’e-mail et l’écran
`/admin/demandes`. Aucune roadmap ne les couvrait : la v3 était close avant.

Cette v4 **n’ajoute rien**. Elle n’est ni un produit ni une fonctionnalité :
c’est la liste de ce qu’un parcours complet des écrans, à 375 px puis à 360 px,
laisse voir de rugueux. Trois familles de défauts en ressortent, et elles se
ressemblent :

1. **Des libellés qui ne tiennent pas dans la place qu’on leur a donnée.** Une
   pastille de jour affiche « Comple », une pastille de jour particulier affiche
   « 1 … » qu’il s’agisse d’une ouverture ou d’une fermeture. Dans les deux cas
   la couleur reste seule à porter l’information — ce que
   [docs/systeme-visuel.md](docs/systeme-visuel.md) interdit à sa première ligne.
2. **Des écrans qui demandent de faire défiler pour ce qu’ils devraient
   montrer.** L’étape 1 du tunnel aligne 34 prestations sur 4787 px sans la
   recherche que la vitrine possède déjà. La page des prestations empile 239
   boutons sur 8236 px.
3. **Des choses calculées puis jetées.** Le message qui dit à Arzu si l’e-mail
   est parti, la couleur de catégorie qui n’est jamais vérifiée, une bannière
   d’annulation qu’aucun chemin n’atteint, une variante sombre sans jetons.

Le principe de la v2 reste la mesure de tout : **le téléphone est l’écran
principal**, et aucune formulation ne doit demander d’explication.

### Ce que cette v4 s’interdit

| Sujet | Décision |
| --- | --- |
| Nouvelles fonctionnalités | **Aucune.** Chaque élément corrige un écran existant ou supprime du code mort. Là où un élément ajoute de l’interface — la recherche à l’étape 1, le contraste affiché dans le sélecteur de couleur — il réemploie un module déjà écrit et ne crée aucune capacité nouvelle. |
| Mode sombre | **Retiré, pas livré.** La variante `dark` existe sans jetons ; on supprime la surface morte. Livrer un thème serait un ajout. |
| Persistance du tunnel entre deux chargements | **Écarté.** Un rechargement à l’étape 4 renvoie aujourd’hui à l’étape 1. C’est réel, mais le corriger est une fonctionnalité, pas une finition. |
| Tests de bout en bout | **Toujours interdits.** Règle non négociable d’`AGENTS.md`. Les constats de ce document ont été relevés à la main dans un navigateur, et c’est ainsi qu’ils seront revérifiés. |
| Schéma de base | **Intact.** Aucun élément ne touche à Prisma, ni de façon additive. |

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
- **Un envoi ne doit jamais bloquer ni faire échouer une mutation.**
- **Une seule tâche planifiée**, celle du dimanche soir. Elle ne se dédouble pas.
- **Le mot « client·e » ne s’écrit pas**, et
  [docs/vocabulaire.md](docs/vocabulaire.md) fait foi pour tout libellé. Ce
  document suit la même règle.
- **Aucune couleur littérale** dans `app/` ni `components/` : les intentions
  passent par les jetons de `app/globals.css`. Les gabarits d’e-mail restent la
  seule exception, et elle est documentée.

## Lecture du backlog

**Statuts :** ✅ terminé · 🟡 en cours · ⏳ prêt à démarrer · 🔒 bloqué · ❌ abandonné.
Le statut figure dans le titre et se réévalue après chaque livraison.

- **Priorité P0** : se voit à l’écran tous les jours, ou fait courir un risque.
- **Priorité P1** : gain net, sans urgence.
- **Effort S** : changement localisé ; **M** : plusieurs composants ; **L** :
  évolution transverse. **Aucun élément de cette v4 n’est L.**

### État actuel

| Statut | Éléments |
| --- | --- |
| ✅ Terminés | 1 à 4, 6, 9, 10, 11, 14, 19 |
| 🟡 En cours | Aucun |
| ⏳ Prêt à démarrer | 5, 7, 8, 12, 13, 15 à 18 |
| 🔒 Bloqués | Aucun |
| ❌ Abandonné | Aucun |

### Comment les constats ont été obtenus

Les mesures citées viennent du navigateur, viewport 375 × 812 puis 360 × 780,
session d’administration ouverte, base locale ensemencée. Les rapports de
contraste sont calculés selon WCAG 2.1 après composition de l’opacité sur le
fond réel. Les références `fichier:ligne` renvoient à l’état du dépôt au moment
de l’écriture.

---

## I. Le tunnel de réservation

### 1. Retrouver une prestation sans parcourir six écrans — ✅

**Priorité : P0 · Effort : M · Nature : cohérence**

**Constat.** L’étape 1 du tunnel aligne les 34 prestations groupées par
catégorie, sans recherche ni filtre : **4787 px de défilement à 375 px**, soit
six écrans, pour choisir une ligne. La vitrine, elle, offre depuis la v1 un
champ de recherche et des pastilles de catégorie
(`components/sections/service-catalog.tsx:91-119`). Quelqu’un qui arrive
directement sur `/reservation` — le lien de la barre du bas, le raccourci de la
PWA, le bouton du pied de page — perd l’outil que la page d’accueil lui donnait.

**Ce qu’il faut changer.** Reprendre le filtre existant tel quel :
`lib/catalog/filter.ts` est déjà pur et déjà testé, les pastilles sont déjà
écrites. L’étape 1 reçoit le même champ et les mêmes pastilles, avec le même
compteur de résultats annoncé en `aria-live`. Aucune requête supplémentaire :
le catalogue est déjà entièrement chargé à cette étape.

Deux points d’attention :

- la pastille sélectionnée ne doit pas survivre au passage à l’étape suivante ni
  au retour en arrière — le fil d’Ariane ramène à la liste complète ;
- l’entrée par lien direct (`?service=`) saute cette étape et n’est pas
  concernée.

**Critères d’acceptation :**

- l’étape 1 propose la même recherche et les mêmes pastilles que la vitrine, et
  n’en propose pas une deuxième variante ;
- aucun appel serveur nouveau, aucune fonction de filtrage nouvelle ;
- une recherche sans résultat propose de réinitialiser, comme sur la vitrine ;
- `/reservation` conserve sa coquille prérendue.

**Dépendances :** aucune.

### 2. Rendre les sept pastilles de jour lisibles à 360 px — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** Les sept jours de la semaine tiennent dans **42 px chacun** à
375 px. Le libellé d’état est écrit à 11 px sous le numéro du jour, et il
dépasse : mesuré, **cinq pastilles sur sept** débordent leur boîte. À l’écran on
lit « Comple », « Fermé— », « Fermé— ». À 360 px, la largeur cible du projet,
c’est pire.

Le code a anticipé une partie du problème — un commentaire
(`components/reservation/week-availability-picker.tsx:158-159`) explique que le
nom complet de l’état vit dans l’`aria-label`, jamais tronqué. C’est juste, et
il ne faut rien y changer. Ce qui n’a pas été anticipé, c’est que le texte
**visible** serait coupé au milieu d’un mot : ce n’est pas une abréviation, ça
se lit comme un défaut d’affichage.

**Ce qu’il faut changer.** Sur les largeurs étroites, ne garder dans la pastille
que l’icône d’état et le numéro du jour. La légende — « Disponible · Sur demande
· Complet · Fermé » — est affichée juste en dessous
(`week-availability-picker.tsx:175-192`) et porte déjà les quatre noms en toutes
lettres. L’`aria-label` reste inchangé. Au-delà de `sm`, le libellé revient.

**Critères d’acceptation :**

- à 360 px, aucune pastille de jour n’a de texte coupé, vérifié par
  `scrollWidth === clientWidth` sur les sept ;
- l’état de chaque jour reste lisible sans la couleur, par l’icône et par la
  légende ;
- l’`aria-label` continue de porter le nom complet de l’état ;
- la hauteur de la bande de jours ne change pas.

**Dépendances :** aucune.

### 3. Empêcher l’adresse e-mail de partir dans l’URL — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** Le formulaire de l’étape « votre adresse e-mail » est déclaré
`<form noValidate onSubmit={…}>` **sans `action` ni `method`**
(`components/reservation/reservation-wizard.tsx:794-801`). Tant que React n’a
pas hydraté la page, aucun gestionnaire n’est attaché : appuyer sur
« Continuer » déclenche la soumission native du navigateur, c’est-à-dire un
`GET` vers l’URL courante avec les champs en paramètres.

Observé pendant l’audit, requête réelle :

```
GET /reservation?email=…%40example.com&website=
```

L’adresse se retrouve dans la barre d’URL, dans l’historique du navigateur,
dans le `Referer` envoyé à toute ressource externe de la page, et dans les
journaux d’accès. Le pot de miel `website` part avec elle. `reservation-wizard`
est un composant client de 1288 lignes : sur un téléphone de milieu de gamme en
4G, la fenêtre entre l’affichage et l’hydratation n’est pas théorique, et c’est
exactement le public visé.

**Ce qu’il faut changer.** Deux mesures, la seconde ne dispensant pas de la
première :

- déclarer `method="post"` sur le formulaire — une soumission avant hydratation
  n’écrit alors plus rien dans l’URL ;
- désactiver le bouton d’envoi tant que le composant n’est pas monté, pour que
  la soumission précoce ne parte pas du tout.

Le même contrôle vaut pour le second écran de l’étape — nom, prénom, téléphone —
qui partage le formulaire.

**Critères d’acceptation :**

- une soumission déclenchée avant hydratation n’écrit ni adresse ni pot de miel
  dans l’URL, vérifié en observant les requêtes réseau ;
- le parcours normal, une fois hydraté, est strictement inchangé ;
- aucune régression sur le pot de miel : il reste `tabIndex={-1}` et
  `aria-hidden`.

**Dépendances :** aucune.

### 4. Reprendre le focus, annoncer les étapes, poser un lien d’évitement — ✅

**Priorité : P1 · Effort : S · Nature : correction**

**Constat.** `goToStep` ne fait que défiler
(`components/reservation/reservation-wizard.tsx:227-233`). Le bouton qui vient
d’être pressé devient `disabled` — c’est le cas dans le fil d’Ariane — ou
disparaît avec l’étape ; le focus retombe alors sur `<body>`. Rien n’annonce le
changement d’étape : quelqu’un qui navigue au clavier ou à la voix traverse le
tunnel dans le silence, et repart du haut de la page à chaque fois.

Les deux écrans terminaux — « votre rendez-vous est confirmé » et « ce n’est pas
encore un rendez-vous » — remplacent tout le tunnel **sans déplacer le focus et
sans `role="status"`**. C’est le moment le plus important du parcours, et c’est
le seul qui n’est pas annoncé.

Enfin, aucune page ne propose de lien d’évitement, et `<main>` n’a pas d’`id` :
chaque page monte un en-tête fixe avant le contenu. Et `<html lang="fr">`
(`app/layout.tsx:123`) quand `siteConfig.language` et tout le formatage `Intl`
sont en `fr-CH`.

**Ce qu’il faut changer.** Placer le focus sur le titre de l’étape atteinte,
ajouter une région `aria-live` qui nomme l’étape en cours, faire de même sur les
deux écrans terminaux. Ajouter un lien d’évitement en tête de la coquille, un
`id` sur `<main>`, et corriger l’attribut de langue.

**Critères d’acceptation :**

- après chaque changement d’étape, le focus est sur le titre de la nouvelle
  étape, et son nom est annoncé une fois ;
- l’écran de confirmation et l’écran de demande reçoivent le focus et sont
  annoncés ;
- la première tabulation sur chaque page publique atteint un lien d’évitement
  visible au focus ;
- `lang="fr-CH"`.

**Dépendances :** aucune.

### 5. Ne plus proposer d’installer l’application au milieu d’une réservation — ⏳

**Priorité : P1 · Effort : S · Nature : correction**

**Constat.** La bannière d’installation choisit sa variante selon le chemin
(`components/pwa/install-prompt.tsx:27-31`) mais ne se demande jamais si le
moment est bon. Observé pendant l’audit : elle s’ouvre au milieu de
`/reservation`, recouvrant la liste des prestations pendant le choix, et sur
`/admin/login`, c’est-à-dire avant même que quiconque soit identifié.

La barre de réservation mobile, elle, sait déjà s’effacer devant la bannière
(`components/reservation/mobile-booking-bar.tsx:12-49`) : l’attention portée à
la collision existe, elle n’a simplement pas été portée au tunnel.

**Ce qu’il faut changer.** N’afficher la bannière publique que sur `/`, et la
bannière d’administration que sur les écrans authentifiés — jamais sur
`/admin/login`. Le délai et la mémoire de rejet ne changent pas.

**Critères d’acceptation :**

- aucune bannière ne s’ouvre sur `/reservation`, `/mes-rendez-vous` ni
  `/admin/login` ;
- la proposition reste atteignable depuis le pied de page, qui porte déjà
  `InstallAppButton` ;
- le rejet reste mémorisé pour la même durée qu’aujourd’hui.

**Dépendances :** aucune.

---

## II. Ce que l’on voit

### 6. Ramener les en-têtes de catégorie au-dessus de 4,5:1 — ✅

**Priorité : P0 · Effort : M · Nature : correction**

**Constat.** L’en-tête de chaque catégorie de la vitrine prend pour fond la
couleur saisie dans l’administration, et écrit dessus en blanc
(`components/sections/service-catalog.tsx:129-136`). Mesuré sur la couleur
actuelle, `rgb(146, 123, 89)` :

| Texte | Taille | Contraste | Verdict |
| --- | --- | --- | --- |
| Nom de la catégorie | 20 px gras | **3,81:1** | passe, mais seulement au titre de « grand texte » |
| Description | 14 px | **3,21:1** | **échoue** — le seuil AA est 4,5:1 |

Rien ne vérifie la couleur choisie. Une teinte plus claire rend les deux
illisibles sans qu’aucun écran ne le signale. C’est la seule couleur du site qui
échappe aux jetons — et donc au soin déjà pris ailleurs : le commentaire de
`app/globals.css:131-132` note que `--brand` a été assombri exprès pour
atteindre 4,54:1.

Détail révélateur : les **huit** catégories portent aujourd’hui la même couleur.
Le réglage promet une distinction qu’aucune donnée n’exploite.

**Ce qu’il faut changer.** Dériver la couleur du texte de la couleur de fond —
clair sur fond foncé, foncé sur fond clair — au lieu de forcer le blanc, et
retirer `text-white/80` au profit d’une opacité qui reste au-dessus du seuil.
Dans le sélecteur de couleur de l’administration, afficher le contraste obtenu
et prévenir en dessous de 4,5:1. Le même risque pèse sur les légendes en blanc
posées sur les images de la galerie et du hero : les vérifier au passage.

**Critères d’acceptation :**

- nom et description d’une catégorie atteignent 4,5:1 quelle que soit la couleur
  enregistrée ;
- le sélecteur affiche le contraste obtenu et le signale s’il est insuffisant ;
- aucune couleur littérale n’apparaît dans `app/` ni `components/` ;
- les légendes sur image sont vérifiées et corrigées si besoin.

**Dépendances :** aucune.

### 7. Retirer la variante sombre morte — ⏳

**Priorité : P1 · Effort : S · Nature : nettoyage**

**Constat.** `app/globals.css:5` déclare `@custom-variant dark`, et
`components/ui/button.tsx:14,18,20` porte des utilitaires `dark:` hérités de
shadcn. Il n’existe **aucun bloc de jetons `.dark`**, aucun traitement de
`prefers-color-scheme`, aucun sélecteur de thème.
[docs/systeme-visuel.md](docs/systeme-visuel.md) l’écrit déjà : « le mode sombre
n’est pas activé : aucune classe `dark:` ne doit être ajoutée tant qu’un jeu de
jetons `.dark` n’existe pas ».

Le résultat est une surface inatteignable qui donne le change : la variante
existe, on croit pouvoir s’en servir, et si `.dark` était posé un jour les
utilitaires actuels se déclencheraient contre des jetons clairs.

**Ce qu’il faut changer.** Supprimer la variante et les classes `dark:`
résiduelles. Le document de charte garde sa règle : elle devient une règle sans
exception à surveiller. Livrer un vrai thème sombre reste hors de cette v4 —
c’est un ajout, pas une finition.

**Critères d’acceptation :**

- plus aucun `dark:` ni `@custom-variant dark` dans `app/` ni
  `components/` ;
- aucun changement visible sur aucun écran ;
- `docs/systeme-visuel.md` reformulé au présent.

**Dépendances :** aucune.

### 8. Ramener l’administration sur la charte — ⏳

**Priorité : P1 · Effort : M · Nature : cohérence**

**Constat.** La v2 a aligné tous les écrans sur `Button`, `FormField` et
`formControlClass`. Le catalogue et quelques panneaux d’administration sont
restés en arrière, et cela se voit :

- **Rayons.** `rounded-2xl` sur la page des prestations
  (`app/admin/services/page.tsx:75`), le formulaire de prestation
  (`components/admin/service-form.tsx:51`) et les deux panneaux d’envoi de
  fichier, alors que tous les autres panneaux sont en `rounded-3xl`. Cette
  section a l’air d’une génération plus ancienne.
- **Champs hors `FormField`.** `app/admin/availability/page.tsx:210-241`,
  `components/admin/availability-exception-calendar.tsx:440-586`,
  `components/admin/service-category-panel.tsx:71-103`,
  `components/admin/data-export-panel.tsx:32-50`,
  `components/admin/admin-search.tsx:185-256` écrivent leurs libellés à la main.
- **L’écran de connexion** écrit son propre champ
  (`app/admin/login/page.tsx:38-45`) avec `focus:ring-2` là où
  `formControlClass` pose `focus-visible:ring-3`, et une ombre qu’on ne trouve
  nulle part ailleurs.
- **Un même mot dit de trois façons** : « (facultatif) » venu de `FormField`,
  « (optionnel) » écrit à la main
  (`availability-exception-calendar.tsx:574-577`), « (optionnelle) »
  (`service-category-panel.tsx:83-86`).
- **Le sélecteur de couleur** passe par `formControlClass` dans le formulaire de
  prestation (`service-form.tsx:268-277`) et par une classe locale dans le
  panneau de groupe (`service-category-panel.tsx:96-102`).

**Ce qu’il faut changer.** Passer ces écrans sous `FormField` et
`formControlClass`, ramener les rayons à la convention, et n’écrire
« (facultatif) » qu’à un seul endroit — dans `FormField`.

**Critères d’acceptation :**

- aucun `<label>` de `components/admin/` ni de `app/admin/` ne construit son
  libellé à la main ;
- la mention d’un champ facultatif provient d’une seule source ;
- les panneaux d’administration partagent le même rayon ;
- l’écran de connexion utilise `FormField` ;
- `pnpm exec vitest run tests/ui/system.test.ts` passe.

**Dépendances :** aucune.

---

## III. L’agenda et les écrans d’Arzu

### 9. Réparer la barre du bas quand une demande attend — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** La barre du bas de l’administration est une grille à **cinq
colonnes fixes** (`components/admin/admin-navigation.tsx:202`). Le tableau des
entrées en compte **six** dès qu’une demande de dernière minute attend une
réponse (`:105-114`) : une entrée « Demandes » s’insère alors après « Agenda ».

Conséquence : la sixième entrée passe à la ligne, la barre double de hauteur —
chaque ligne fait `min-h-[4.25rem]` — pendant que le contenu ne réserve que
`5.25rem` de dégagement (`:42`). Le bas de page passe sous la barre. Le défaut
se déclenche **exactement** au moment où une demande est urgente, c’est-à-dire
au seul moment où l’écran doit être net.

Le commentaire du code (`:103-104`) explique le choix d’une entrée
conditionnelle, et il est bon ; c’est la grille qui n’a pas suivi.

**Ce qu’il faut changer.** Faire dépendre le nombre de colonnes du nombre
d’entrées, et calculer le dégagement du contenu sur la hauteur réelle de la
barre plutôt que sur une constante.

**Critères d’acceptation :**

- avec six entrées, la barre garde une seule ligne à 360 px et aucun libellé
  n’est coupé ;
- le bas de la page reste atteignable dans les deux cas, safe area comprise ;
- les cibles restent au-dessus de 44 px avec six entrées.

**Dépendances :** aucune.

### 10. Rendre tapables les raccourcis de l’agenda — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** Le projet tient 44 px partout — `Button` en taille `sm` comprise,
et le commentaire de `components/ui/button.tsx:23-37` dit pourquoi. Deux
exceptions subsistent, et ce sont précisément les raccourcis de saisie rapide :

- le `+` en tête de colonne de la grille de semaine fait **28 px**
  (`components/admin/admin-week-grid.tsx:112`) ;
- les zones de pré-remplissage d’une heure libre font
  `QUICK_ADD_STEP_MINUTES × PIXELS_PER_MINUTE`, soit `15 × 1,1` = **16,5 px** de
  haut (`admin-week-grid.tsx:151`, `lib/admin/agenda-timeline.ts:323`), et
  22,5 px sur la chronologie détaillée du téléphone
  (`components/admin/admin-day-timeline.tsx:211-216`).

Ce sont les gestes annoncés comme le moyen rapide d’ajouter un rendez-vous à une
heure précise, et ce sont les seuls qu’on ne peut pas viser au doigt.

**Ce qu’il faut changer.** Porter le `+` à 44 px. Pour les zones de
pré-remplissage, découpler la cible tactile de la hauteur dessinée : la bande
reste fine à l’écran, la zone cliquable est étendue au-delà, sans recouvrir la
bande voisine au point de rendre le choix de l’heure imprévisible.

**Critères d’acceptation :**

- aucun contrôle interactif de l’agenda ne mesure moins de 44 px dans sa plus
  petite dimension ;
- l’apparence de la chronologie ne change pas ;
- l’heure pré-remplie correspond toujours à la bande visée.

**Dépendances :** aucune.

### 11. Distinguer une ouverture d’une fermeture dans les jours particuliers — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** Dans le calendrier des jours particuliers, un jour marqué porte une
pastille « 1 ouv. » ou « 1 ferm. »
(`components/admin/availability-exception-calendar.tsx:304-310`). Les deux sont
écrites à 11 px dans une boîte de **27 px** avec `truncate`. Mesuré à 375 px,
les deux affichent « **1 …** ». Il n’y a ni `title` ni `aria-label` pour
rattraper.

Il ne reste alors que la couleur de fond pour dire si le jour ajoute des heures
ou en retire. C’est exactement ce que la première règle de
[docs/systeme-visuel.md](docs/systeme-visuel.md) interdit : « le libellé décrit
toujours l’état ou l’action : la couleur et l’icône ne sont jamais les seules
informations disponibles ». Et c’est une information qu’on ne peut pas deviner :
une ouverture exceptionnelle et des vacances sont l’inverse l’une de l’autre.

**Ce qu’il faut changer.** Remplacer le mot tronqué par une icône explicite —
plus et moins — accompagnée du nombre, avec le libellé complet dans
l’`aria-label` de la cellule. Le libellé en toutes lettres revient dès que la
place existe.

**Critères d’acceptation :**

- à 360 px, une ouverture et une fermeture se distinguent sans la couleur ;
- aucune pastille n’a de texte coupé ;
- la cellule annonce son contenu complet aux technologies d’assistance ;
- la hauteur des cellules du calendrier ne change pas.

**Dépendances :** aucune.

### 12. Rendre la carte du prochain rendez-vous utile, ou la faire taire — ⏳

**Priorité : P1 · Effort : S · Nature : correction**

**Constat.** L’agenda ouvre sur une carte « Aucun rendez-vous à venir » suivie de
« Le prochain rendez-vous confirmé s’affichera ici dès la première réservation. »
(`app/admin/page.tsx:227-228`). Deux problèmes, observés le même jour :

- **la phrase est fausse.** Des réservations existent — il y en avait une le
  matin même. La carte est vide parce qu’il ne reste rien **à venir**, pas parce
  que rien n’a jamais été réservé. On explique à Arzu qu’elle n’a jamais reçu
  personne ;
- **elle coûte le haut de l’écran.** Vide, elle occupe **230 px** avant la bande
  de semaine, et la journée ne commence qu’à 462 px. Le principe posé par la v2
  — Arzu voit sa journée sans défiler — tient encore de justesse, mais c’est le
  bloc qui n’a rien à dire qui consomme le plus de place.

**Ce qu’il faut changer.** Écrire ce que la carte constate vraiment : plus aucun
rendez-vous confirmé à venir. Et réduire la carte à une ligne quand elle est
vide, pour rendre la journée à sa place.

**Critères d’acceptation :**

- la phrase ne prétend plus qu’aucune réservation n’a jamais eu lieu ;
- vide, le bloc tient sur une ligne ;
- à 375 px, le premier rendez-vous de la journée reste visible sans défiler ;
- aucun terme du tableau des interdits de
  [docs/vocabulaire.md](docs/vocabulaire.md).

**Dépendances :** aucune.

### 13. Désencombrer la ligne d’une prestation — ⏳

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat.** La page des prestations, mesurée à 375 px : **8236 px** de
défilement et **239** boutons et liens. Chaque prestation occupe une ligne haute
de **177 px**, repliée sur trois rangs, pour six contrôles
(`app/admin/services/page.tsx:131-210`) :

```
👁 Réservable   [⌃] [⌄] [Modifier]
[dupliquer] [archiver] [supprimer]
```

Cinq de ces six contrôles sont des boutons-icônes de 44 px de forme identique.
« Archiver » et « Supprimer » sont voisins, et l’un est réversible quand l’autre
ne l’est pas. Les `aria-label` sont corrects — « Monter Petite zone »,
« Archiver Petite zone » — mais rien ne distingue les boutons à l’œil. Et la
ligne du groupe porte ses propres `⌃ ⌄` et son propre « Modifier », visuellement
identiques à ceux d’une prestation, à 250 px de distance.

**Ce qu’il faut changer.** Ne garder en façade que ce qui sert tous les jours —
« Modifier » et l’ordre — et rassembler dupliquer, archiver et supprimer
derrière une seule ouverture par ligne. Distinguer nettement les contrôles du
groupe de ceux d’une prestation.

**Critères d’acceptation :**

- une ligne de prestation tient sur un rang à 375 px ;
- « Supprimer » n’est plus voisin immédiat d’« Archiver » ;
- les contrôles d’un groupe ne se confondent plus avec ceux d’une prestation ;
- le nombre de contrôles atteignables au premier regard baisse nettement, et la
  page reste utilisable au clavier ;
- aucune capacité n’est retirée.

**Dépendances :** l’élément 8 touche les mêmes fichiers ; les mener ensemble.

### 14. Confirmer chaque enregistrement, et dire si l’e-mail est parti — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** La v2 a posé une règle : « toute action asynchrone confirme son
résultat par un `AppToast`, au lieu de laisser la page se rafraîchir en
silence ». Deux écrans ne la suivent pas, et ce sont les deux plus utilisés :

- **enregistrer un rendez-vous ne confirme rien.**
  `components/admin/appointment-form.tsx:134-135` n’ouvre le toast **que** si
  l’action échoue ; en cas de succès il navigue. Le serveur compose pourtant un
  message qui dit qui a été prévenu — « … a été prévenu par e-mail », ou
  « Personne n’a été prévenu : ce rendez-vous n’a pas d’adresse e-mail »
  (`lib/admin/appointment-notification.ts:36-43`). Ce message est calculé, puis
  jeté. C’est précisément l’information qu’Arzu ne peut pas deviner ;
- **créer une prestation ne confirme rien non plus.** `updateService` redirige
  avec `?saved=1` et l’écran affiche un badge ; `createService` redirige sans
  (`lib/actions/catalog.ts:279` contre `:321`). Deux gestes voisins, deux
  retours différents.

**Ce qu’il faut changer.** Afficher le message du serveur après un
enregistrement réussi, avant ou pendant la navigation, et ajouter `?saved=1` à
la création d’une prestation.

**Critères d’acceptation :**

- créer et modifier un rendez-vous confirment tous deux, et disent si un e-mail
  est parti et vers quelle adresse ;
- créer et modifier une prestation donnent le même retour ;
- un échec continue d’afficher son message et de ne pas naviguer.

**Dépendances :** aucune.

### 15. Corriger ce que la navigation admin annonce — ⏳

**Priorité : P1 · Effort : S · Nature : correction**

**Constat.** Trois annonces sont fausses ou incomplètes :

- **le badge des demandes ment.** `activityBadge` écrit en texte caché
  « N activité(s) non lue(s) », et il est réemployé tel quel pour le compteur de
  demandes en attente (`components/admin/admin-navigation.tsx:54-68`, appelé en
  `:166` et `:223`). Un lecteur d’écran annonce donc les demandes urgentes
  comme des activités non lues ;
- **les deux navigations portent le même nom.** « Navigation de
  l’administration » sur la barre haute (`:143`) et sur la barre basse (`:199`) :
  dans une liste de repères, on ne peut pas les distinguer ;
- **le bandeau de jours promet un motif qu’il n’implémente pas.** Il déclare
  `role="tablist"`, `role="tab"` et `aria-selected`
  (`components/admin/admin-agenda-view.tsx:95-126`) sans navigation aux flèches
  ni `tabindex` mobile. Même écart sur les onglets de recherche, qui portent
  `aria-current="page"` sur des boutons qui ne naviguent pas
  (`components/admin/admin-search-tabs.tsx:43-58`).

**Ce qu’il faut changer.** Donner au badge des demandes son propre texte caché,
nommer les deux navigations différemment, et pour les bandeaux : soit compléter
le motif d’onglets au clavier, soit renoncer aux rôles ARIA et s’en tenir à des
boutons avec `aria-pressed`. La seconde voie est la plus courte et la plus
honnête.

**Critères d’acceptation :**

- le badge des demandes annonce des demandes ;
- les deux repères de navigation portent des noms distincts ;
- aucun rôle ARIA n’est déclaré sans le comportement clavier qu’il implique ;
- `aria-current="page"` ne figure plus sur un bouton qui ne navigue pas.

**Dépendances :** l’élément 9 touche le même fichier.

### 16. Donner une page d’erreur et une page introuvable à l’administration — ⏳

**Priorité : P1 · Effort : S · Nature : correction**

**Constat.** Il n’existe **aucun `error.tsx` ni `not-found.tsx`** dans le
projet. Une action serveur qui lève — une analyse Zod ratée dans
`lib/actions/catalog.ts:240-246`, par exemple — ou un `notFound()` sur
`/admin/appointments/[id]` renvoie l’écran par défaut de Next : en anglais, sans
la charte, sans chemin de retour, et sans rien dire de ce qu’il faut faire. Les
téléchargements CSV répondent quant à eux par du texte brut
(`app/admin/data/export/[type]/route.ts:30,43,49,59`).

Le reste du projet soigne pourtant ses messages : `docs/vocabulaire.md:133-140`
exige qu’une erreur dise ce qui s’est passé, puis quoi faire ensuite.

**Ce qu’il faut changer.** Ajouter un `error.tsx` et un `not-found.tsx` sous
`app/admin/`, en français, dans la charte, avec un retour vers l’agenda et la
consigne d’usage. Ajouter les mêmes garde-fous côté public.

**Critères d’acceptation :**

- une action serveur qui lève affiche un écran en français, dans la charte, avec
  un retour vers l’agenda ;
- un identifiant inconnu affiche une page introuvable, pas l’écran par défaut ;
- les messages suivent la règle « ce qui s’est passé, puis quoi faire » ;
- un export qui échoue ne répond plus par du texte brut.

**Dépendances :** aucune.

---

## IV. Les mots et les restes

### 17. Une seule façon de dire qu’une session a expiré — ⏳

**Priorité : P1 · Effort : S · Nature : cohérence**

**Constat.** La même situation reçoit trois réponses différentes :

| Où | Phrase |
| --- | --- |
| Administration, dix fois | « Votre session a expiré. Reconnectez-vous, puis recommencez. » |
| Déplacement et annulation depuis le site (`lib/actions/reservation.ts:470,516`) | « Votre session a expiré. Reconnectez-vous. » |
| Retrait d’une demande (`lib/actions/late-requests.ts:219`) | « Votre session a expiré. Indiquez à nouveau votre adresse. » |

Les deux premières demandent de « se reconnecter » à des personnes qui n’ont
aucun mot de passe : côté public, la seule chose à faire est de ressaisir son
adresse. La troisième est donc la bonne, et c’est la seule des trois à ne pas
être la plus répandue.

Deux autres écarts, de la même famille :

- **les refus d’origine ne disent rien à faire** : « La demande est invalide. »
  (`reservation.ts:458,508`), « Ce rendez-vous est invalide. » (`:511`),
  « Action impossible depuis cette page. » (`late-requests.ts:208`). C’est
  exactement ce que `docs/vocabulaire.md:133-140` proscrit : dire ce qui s’est
  passé, puis nommer le geste ;
- **le développeur a deux noms.** « prévenez Noé »
  (`lib/actions/admin-agenda.ts:434`, `lib/actions/admin-customers.ts:94`)
  contre « prévenez le développeur » (`lib/actions/admin-late-requests.ts:84,143`).
  Même personne, même situation, deux registres — le second est arrivé avec la
  phase 2 des demandes.

**Ce qu’il faut changer.** Une phrase d’expiration côté public, une côté
administration, chacune nommant le geste qui existe réellement. Une consigne
dans chaque refus d’origine. Un seul nom pour le développeur.

**Critères d’acceptation :**

- une seule formulation d’expiration par audience ;
- aucun message public ne demande de « se reconnecter » ;
- chaque refus dit ce qui s’est passé puis quoi faire ;
- un seul nom pour le développeur dans tout le dépôt.

**Dépendances :** aucune.

### 18. Retirer la bannière d’annulation morte et le statut « terminé » des messages — ⏳

**Priorité : P1 · Effort : S · Nature : nettoyage**

**Constat.** Deux restes, l’un de code, l’autre de vocabulaire :

- **`?cancelled=` n’est jamais écrit.** `app/mes-rendez-vous/page.tsx:46` le
  déclare, `:103` le lit, `:121-125` affiche une bannière de succès — et rien,
  nulle part, ne pose ce paramètre : l’annulation renvoie un `MutationResult` et
  la carte appelle `router.refresh()`. La bannière est inatteignable, et elle
  est rendue **au-dessus du `<h1>`**, ce qui donnerait un ordre étrange si elle
  s’affichait un jour. Le `mt-8` du titre laisse par ailleurs un écart inexpliqué
  en haut de la carte de connexion ;
- **« terminé » nomme un statut que plus personne n’écrit.** « Ce rendez-vous
  n’est plus actif : il a déjà été annulé ou terminé. » apparaît des deux côtés
  (`lib/actions/reservation.ts:534`, `lib/actions/admin-agenda.ts:470`), alors
  que `COMPLETED` n’est plus posé par aucun chemin — la v3 l’a constaté et
  assumé. La valeur reste dans l’énumération pour les lignes anciennes, ce qui
  est juste ; c’est la phrase affichée qui n’a plus de sens.

**Ce qu’il faut changer.** Supprimer le paramètre, la bannière et l’écart de
mise en page qu’elle laissait. Réécrire la phrase autour de ce qui arrive
vraiment : le rendez-vous a été annulé, ou il est passé.

**Critères d’acceptation :**

- `?cancelled=` ne figure plus nulle part ;
- la carte de connexion de « Mes rendez-vous » n’a plus d’écart inexpliqué ;
- aucun message affiché ne nomme un statut que le code n’écrit plus ;
- `pnpm knip` ne signale rien de nouveau.

**Dépendances :** aucune.

### 19. Remettre `AGENTS.md` et `README.md` d’accord avec le code — ✅

**Priorité : P0 · Effort : S · Nature : correction**

**Constat.** Les deux livraisons « late booking » ont dépassé la documentation,
et ces fichiers sont ce que lisent en premier les agents qui travaillent sur le
dépôt. Trois affirmations sont fausses :

| Où | Ce qui est écrit | Ce qui est vrai |
| --- | --- | --- |
| `AGENTS.md:223` | « **Quatre messages** existent » | `lib/email/templates.ts` en construit **huit**, dont trois pour les demandes de dernière minute |
| `AGENTS.md:161-166` | Quatre réglages de réservation | Six : `lateRequestsEnabled` et `lateRequestFloorHours` manquent |
| `README.md:37` | « prestation, créneau, coordonnées et vérification » | La v3 a inversé l’ordre : prestation, **coordonnées**, **créneau**, vérification |

Le tableau des caches d’`AGENTS.md:111-116`, lui, est toujours juste.

Reste aussi à consigner ce que la phase 2 a introduit et qu’aucun document ne
mentionne : `/admin/demandes`, les limites de trois demandes par 24 heures et de
deux demandes en attente, le fait qu’une demande n’est **pas** couverte par la
contrainte d’exclusion PostgreSQL — l’acceptation arbitre — et qu’aucune tâche
ne balaie les demandes dépassées, leur état étant déduit à la lecture.

**Ce qu’il faut changer.** Corriger les trois affirmations, ajouter les deux
réglages manquants, décrire les demandes de dernière minute au même niveau de
détail que le reste, et mentionner qu’aucun e-mail de demande n’est renvoyable
depuis `/admin/emails`.

**Critères d’acceptation :**

- aucun chiffre ni ordre d’étapes faux dans `AGENTS.md` ni `README.md` ;
- les six réglages de réservation sont listés ;
- les demandes de dernière minute sont documentées, limites comprises ;
- `CHANGELOG.md` reflète les deux livraisons une fois `develop` publié.

**Dépendances :** aucune. À faire tôt : les autres éléments se lisent mieux sur
une documentation juste.

---

## Ordre de pilotage recommandé

Les P0 d’abord, en commençant par ce qui est court et qui débloque le reste :

1. **19** — la documentation. Une heure, et tout le reste se lit sur une base
   juste.
2. **3** — l’adresse e-mail dans l’URL. Le seul élément qui fait fuiter une
   donnée.
3. **9** — la barre du bas à six entrées. Un défaut qui se déclenche au pire
   moment.
4. **2**, **11** — les deux libellés tronqués. Même défaut, même règle, à mener
   ensemble.
5. **14** — les enregistrements qui ne confirment rien.
6. **10** — les cibles tactiles de l’agenda.
7. **6** — le contraste des en-têtes de catégorie.
8. **1** — la recherche à l’étape 1, le seul M de la première moitié.
9. Puis les P1, en groupant **8** avec **13** (mêmes fichiers) et **9** avec
   **15** (même fichier).

## Écarté avant d’écrire

Trois sujets sont réels et ne figurent pas dans ce backlog, parce qu’ils
ajouteraient au lieu de corriger :

- **la persistance du tunnel entre deux chargements.** Un rechargement à l’étape
  4 renvoie à l’étape 1 et perd le commentaire, l’accord et l’identité. C’est un
  vrai inconfort, mais y répondre demande un stockage local, une durée de vie et
  une décision sur ce qu’on garde d’une personne dans son navigateur ;
- **un vrai mode sombre.** L’élément 7 retire la variante morte ; livrer un
  thème demanderait un jeu de jetons complet et une relecture de chaque écran ;
- **tout test de bout en bout.** La règle d’`AGENTS.md` reste entière. Les
  constats de ce document ont été relevés à la main dans un navigateur, et c’est
  ainsi qu’ils seront revérifiés — les régressions qui peuvent l’être se
  couvrent par un test unitaire sur la fonction responsable.
