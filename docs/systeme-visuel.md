# Système visuel Arbeauté

Ce document décrit les primitives communes à la vitrine, à la réservation et à
l’administration. Elles servent de référence avant d’ajouter de nouvelles
classes locales.

## Principes

- Toute action principale et toute action uniquement représentée par une icône
  mesure au moins 44 × 44 px sur mobile.
- Le libellé décrit toujours l’état ou l’action : la couleur et l’icône ne sont
  jamais les seules informations disponibles.
- Le focus clavier utilise l’anneau global `ring` avec un décalage visible.
- Les champs utilisent `formControlClass` et `FormField` pour relier libellé,
  aide et erreur. Une erreur combine `aria-invalid`, `aria-describedby` et un
  texte annoncé.
- Les animations décoratives sont neutralisées lorsque
  `prefers-reduced-motion: reduce` est actif.
- Les barres mobiles réservent la safe area avec
  `env(safe-area-inset-bottom)` et le contenu reçoit le dégagement équivalent.

## Typographie

Deux familles seulement, chargées par `next/font/google` dans `app/layout.tsx` :

| Rôle | Variable | Famille |
| --- | --- | --- |
| Corps de texte, interface | `--font-sans` | Geist |
| Titres (`font-heading`) | `--font-heading` | Plus Jakarta Sans |

Les grandes tailles sont **fluides** et déclarées dans `app/globals.css`. Il ne
faut plus écrire de suite `text-3xl sm:text-4xl` pour un titre de page :

| Utilitaire | Usage | Bornes |
| --- | --- | --- |
| `text-display` | Titre du hero, une seule occurrence par page | 29,6 px → 72 px |
| `text-title` | Titre de page et de section (`h1`, `h2`) | 25,6 px → 40 px |
| `text-2xl` et en dessous | Sous-titres et titres de carte | échelle Tailwind |
| `text-2xs` | Plancher de lisibilité : légendes, pastilles, chronologie | 11 px |

Le réglage vise un téléphone de 360 px : à cette largeur, le titre du hero tient
sur deux lignes au maximum.

**Aucun texte d’interface ne descend sous 11 px.** `text-2xs` est le plus petit
palier autorisé ; les tailles arbitraires du type `text-[9px]` ne doivent pas
réapparaître, y compris dans la chronologie admin où la place est comptée. Si un
libellé ne tient plus, c’est le libellé qu’il faut raccourcir, pas la police.

## Couleur

Aucune couleur littérale (`#rrggbb`) ni teinte brute de la palette Tailwind
(`rose-500`, `amber-50`, `emerald-200`…) ne doit apparaître dans `app/` ou
`components/`. Les intentions passent par des jetons déclarés dans
`app/globals.css` :

| Rampe | Jetons | Usage |
| --- | --- | --- |
| Marque | `brand-subtle`, `brand-soft`, `brand-line`, `brand`, `brand-strong` | Sur-titres, accents éditoriaux, pastilles de la vitrine |
| Réussite | `success-subtle`, `success-soft`, `success-line`, `success-accent`, `success`, `success-strong` | Créneau libre, confirmation, statut « terminé » |
| Mise en garde | `warning-subtle`, `warning-soft`, `warning-line`, `warning-accent`, `warning`, `warning-strong` | Fermeture, hors horaires, consentement obligatoire |
| Danger | `destructive` et ses opacités | Annulation, suppression, absence |
| Information | `primary` et ses opacités | État neutre mis en avant, rendez-vous en cours |
| Prix | `price` | La seule couleur des montants, partout |
| Encre sur média | `ink-light`, `ink-dark` | Texte et voile posés sur une photo, ou sur une couleur saisie dans l'administration |

Chaque rampe va du fond le plus clair (`-subtle`) au texte le plus foncé
(`-strong`). Le jeton sans suffixe est la couleur pleine : icône, point, surface
saturée.

### L'encre posée sur ce qu'on ne choisit pas

`ink-light` et `ink-dark` sont les deux seules encres qui ne dépendent pas du
thème mais de ce qui passe dessous : une photo, ou la couleur d'un groupe de
prestations. Elles ne se choisissent pas à l'œil — `lib/utils/contrast.ts`
déduit laquelle des deux poser, et cette déduction garantit au moins 4,58:1
quelle que soit la teinte. Les encres teintées du thème ne suffisaient pas :
leur meilleur des deux tombe à 4,05:1 sur les teintes moyennes, dont celle des
catégories. Le sélecteur de couleur de l'administration affiche le contraste
obtenu, pour que la garantie se voie.

Le mode sombre n’est pas activé : aucune classe `dark:` ne doit être ajoutée
tant qu’un jeu de jetons `.dark` n’existe pas dans `app/globals.css`.

### La seule exception : les gabarits d’e-mail

`lib/email/templates.ts` écrit ses couleurs en dur (`#9c5566`, `#241c19`,
`#faf7f5`, `#ece5e1`, `#6d605b`). **Ce n’est pas un oubli**, et il ne faut pas le
« corriger » : les variables CSS ne fonctionnent dans aucun client de messagerie,
et une feuille de style externe encore moins. Les valeurs reprennent celles des
jetons `brand` ; si la marque change de teinte, ces cinq constantes changent à la
main. La règle ci-dessus reste entière pour `app/` et `components/`, qui sont les
seuls répertoires concernés.

## Rayons

Les rayons proviennent tous des jetons `--radius-*`. Aucune valeur arbitraire
(`rounded-[2rem]`) n’est admise. La convention par famille de conteneur :

| Rayon | Usage |
| --- | --- |
| `rounded-full` | Pastilles, badges, boutons ronds, boutons d’icône circulaires |
| `rounded-lg` | Boutons (valeur par défaut de `Button`) |
| `rounded-xl` | Champs de saisie, petits blocs internes, lignes de liste |
| `rounded-2xl` | Cartes et panneaux courants |
| `rounded-3xl` | Grandes cartes de page, formulaires, dialogues |

## Primitives

| Primitive | Usage | Variantes |
| --- | --- | --- |
| `Button` | Actions et liens principaux | default, outline, secondary, ghost, destructive, link |
| `SubmitButton` | Envoi de formulaire avec état de chargement | mêmes variantes que `Button` |
| `FormField` | Libellé, aide et erreur d’un champ | requis ou facultatif |
| `formControlClass` | `input`, `select` et `textarea` | normal, invalide, désactivé |
| `StatusBadge` | État toujours accompagné d’un texte | neutral, info, success, warning, danger |
| `navigationItemBaseClass` | Base des navigations publiques et admin | ligne, barre basse ou onglet actif |
| `ConfirmDialog` | Mutation destructive ou difficile à annuler | titre, conséquence, annuler, confirmer |
| `AppToast` | Retour bref après une action asynchrone | success, danger |
| `EmptyState` | Collection ou journée sans contenu | icône, explication, action facultative |
| `CustomerCallButton` | Appeler, ou dire qu'aucun numéro n'est enregistré | outline, secondary |

Un lien qui se comporte comme un bouton passe par `<Button asChild>` autour du
`<Link>` ou du `<a>`. Il ne faut pas réécrire à la main
`inline-flex … rounded-xl bg-primary …`.

### Ce qui reste légitimement un `<button>` brut

Seuls les contrôles spécialisés, dont l’apparence est indissociable de leur
fonction, conservent un `<button>` local : onglets (`role="tab"`), pastilles de
jour du calendrier, cellules de calendrier, options de liste déroulante
(`role="option"`), pastilles de filtre du catalogue, cartes de prestation
sélectionnables et blocs de la chronologie admin.

## Mise en forme des données

Une même donnée ne s’écrit **jamais** de deux façons selon l’écran. Les
formateurs partagés sont les seuls autorisés, et ils sont couverts par
`tests/reservation/formatting.test.ts` :

| Donnée | Fonction | Rendu |
| --- | --- | --- |
| Date longue | `formatLongDate` | lundi 17 août 2026 |
| Date et heure | `formatAppointmentDate` | lundi 17 août 2026 à 14:00 |
| Date et heure, en liste | `formatCompactMoment` | lun. 17 août 2026 à 14:00 |
| Heure seule | `formatSlotTime` | 14:00 |
| Prix | `formatPrice` | 30 CHF · 75.50 CHF · 1'250 CHF |

La classe CSS `capitalize` est **interdite** : elle met une majuscule à chaque
mot et produisait « Créneau À Choisir » ou « Lundi, 17 Août 2026 ». Pour une
majuscule initiale, `capitalizeFirst` de `lib/utils/format.ts`.

Le détail du raisonnement — virgule d’ICU, séparateur décimal monétaire — est
dans [vocabulaire.md](vocabulaire.md).

## Confirmation destructive

Le déclencheur conserve un libellé explicite. Le dialogue reçoit le focus,
annonce son titre et sa description, bloque l’arrière-plan et rend « Annuler »
accessible avant l’action destructive. Une confirmation intégrée sous forme de
deux petits boutons ne doit plus être créée localement : l’annulation d’un
rendez-vous depuis le site passe elle aussi par `ConfirmDialog`.

## État de la migration

Les points 1 à 7, 10 et 13 de [ROADMAP-V2.md](../ROADMAP-V2.md) ont aligné
l’ensemble des écrans sur ce document :

- typographie unifiée sur Geist et Plus Jakarta Sans, avec une échelle fluide ;
- toutes les actions passent par `Button`, `SubmitButton` ou `ConfirmDialog` ;
- tous les champs passent par `FormField` et `formControlClass` ;
- plus aucune couleur littérale ni teinte Tailwind brute ;
- rayons ramenés aux jetons `--radius-*` selon la convention ci-dessus ;
- plancher de 11 px appliqué partout, `--brand` porté à 4,54:1 sur fond clair ;
- aucune cible tactile sous 44 px, `Button` compris en taille `sm` ;
- toute action asynchrone confirme son résultat par un `AppToast`, au lieu de
  laisser la page se rafraîchir en silence ;
- dates, heures et prix passent par les formateurs partagés ci-dessus, et plus
  aucun écran n’emploie `capitalize`.
