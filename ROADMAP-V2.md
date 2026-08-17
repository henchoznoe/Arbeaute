# Roadmap V2 — finition, UX mobile et clarté

## Objectif

La [roadmap v1](ROADMAP.md) est close : ses 24 éléments ont construit les
capacités du produit — catalogue administrable, moteur de disponibilités,
réservation sans compte, espace « Mes rendez-vous », agenda admin, fiches
clientes, statuts, exceptions d’horaires, règles de réservation configurables,
journal d’audit et deux applications installables.

Ce backlog-ci ne cherche plus à ajouter des capacités : il cherche à **finir**.
Trois personnes utilisent réellement le produit — Arzu, ses clientes, et
personne d’autre — et aucune des trois n’est à l’aise avec le web. Le travail
restant est donc de rendre l’interface **cohérente**, **rapide à lire sur un
téléphone** et **impossible à mal comprendre**.

Trois principes gouvernent chaque élément :

1. **Le téléphone est l’écran principal.** 95 % de l’usage s’y déroule. Un écran
   qui n’est pas confortable à une main, en tenant son téléphone, est un écran
   raté — même s’il est parfait sur un ordinateur.
2. **Arzu voit sa journée sans défiler.** Son besoin quotidien tient en une
   question : « qui vient aujourd’hui, à quelle heure ? ». La réponse doit
   apparaître dès l’ouverture de l’application.
3. **Aucune formulation ne doit demander d’explication.** Pas de vocabulaire
   technique, pas de statut ambigu, pas de message d’erreur qui ne dit pas quoi
   faire ensuite.

### Contraintes permanentes

- Interface et contenus en français `fr-CH`, prix en CHF, fuseau
  `Europe/Zurich`. Les commentaires de code restent en français.
- Une seule praticienne, une seule prestation par rendez-vous.
- Mobile d’abord : toute action principale mesure au moins 44 px, les barres
  fixes réservent la safe area iOS.
- Vercel Hobby et Cache Components : chaque route conserve sa coquille statique.
  Une route publique qui glisse en `ƒ Dynamic` est une régression.
- Les créneaux ne sont **jamais** mis en cache. Les transactions sérialisables et
  la contrainte PostgreSQL `appointment_no_confirmed_overlap` restent intactes.
- **Les e-mails transactionnels sont désormais autorisés**, via l’offre gratuite
  de Resend. Un envoi ne doit jamais bloquer ni faire échouer une réservation.
  Toujours aucun SMS, aucun paiement en ligne, aucun abonnement payant.
- **Aucun test de bout en bout, aucun navigateur piloté.** La seule suite
  automatisée est Vitest. Cette règle est explicite et non négociable
  (voir l’élément 12).

## Lecture du backlog

**Statuts :** ✅ terminé · 🟡 en cours · ⏳ prêt à démarrer · 🔒 bloqué. Le statut
figure dans le titre et se réévalue après chaque livraison.

### État actuel

| Statut | Éléments |
| --- | --- |
| ✅ Terminés | 1 à 13 — backlog clos |
| 🟡 En cours | Aucun |
| ⏳ Prêt à démarrer | Aucun |
| 🔒 Bloqués | Aucun |

**Les treize éléments sont livrés.** Les fondations visuelles sont posées et
l’agenda d’Arzu est traité de bout en bout : il s’ouvre sur sa journée, chaque
rendez-vous s’actionne d’un geste et les changements des clientes lui parviennent
sur téléphone. Côté cliente, la vitrine tient dans un écran de téléphone, le
tunnel propose d’emblée la première heure libre, et la réservation confirme puis
prévient par e-mail sans plus rien avertir.

- **Priorité P0** : corrige une friction quotidienne ou prépare plusieurs autres
  éléments.
- **Priorité P1** : gain net une fois les fondations P0 posées.
- **Effort S** : changement localisé ; **M** : plusieurs composants ; **L** :
  évolution transverse, éventuellement avec migration.

---

## Fondations visuelles

### 1. Adopter la typographie Geist et Plus Jakarta Sans — ✅ Terminé

**Priorité : P0 · Effort : S · Nature : amélioration**

**Constat et valeur.** `app/layout.tsx` charge aujourd’hui `Inter` pour le corps
de texte et `Playfair_Display` pour les titres. Le serif Playfair, très
contrasté, se comporte mal en petites tailles sur téléphone : le titre du hero
occupe quatre lignes à 360 px et les titres de section de l’admin paraissent
lourds à côté des libellés d’interface. La référence choisie est bleeze.ch, qui
utilise **Geist** en corps et **Plus Jakarta Sans** pour les titres.

**Recommandation.** Remplacer les deux familles dans `app/layout.tsx` : Geist sur
`--font-sans`, Plus Jakarta Sans sur `--font-heading`. Les variables CSS et les
utilitaires `font-sans` / `font-heading` de `app/globals.css` ne changent pas —
la bascule est donc locale. En profiter pour poser une **échelle typographique
mobile** : les grands titres passent d’une taille figée (`text-5xl`) à une
taille fluide en `clamp()`, afin qu’un titre ne consomme plus un écran entier
sur un petit téléphone.

**Critères d’acceptation :**

- aucune référence à `Inter` ni à `Playfair_Display` ne subsiste dans le projet ;
- les deux polices sont chargées via `next/font/google`, en sous-ensemble latin,
  sans requête vers un domaine tiers au moment du rendu ;
- le titre principal de la page d’accueil tient sur **deux lignes au maximum** à
  360 px de large ;
- aucun décalage de mise en page perceptible au chargement des polices ;
- les budgets de `scripts/verify-build-quality.ts` restent respectés.

**Livré.** `Geist` et `Plus_Jakarta_Sans` remplacent `Inter` et
`Playfair_Display` dans `app/layout.tsx`. `app/globals.css` expose deux
utilitaires fluides, `text-display` (29,6 → 72 px) et `text-title`
(25,6 → 40 px) ; les 23 suites `text-3xl sm:text-4xl` des titres de page ont
disparu. Mesuré dans le navigateur : le titre du hero tient sur deux lignes à
360 px comme à 430 px, sans débordement horizontal.

**Écart assumé.** La bande réservée à la photo d’Arzu (112 px) rendait les deux
lignes géométriquement impossibles à toute taille lisible. La vignette est
passée à `size-24` et la réserve à `pr-24` — un ajustement minimal, la
recomposition du premier écran restant l’élément 8.

**Dépendances :** aucune ; précède les éléments 3 et 8.

### 2. Terminer la migration vers le système visuel commun — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : amélioration**

**Constat et valeur.** La v1 a créé les primitives et les a documentées dans
[docs/systeme-visuel.md](docs/systeme-visuel.md), mais la migration n’a jamais
été menée à son terme. L’état actuel est mesurable :

- **24 fichiers** redessinent un bouton principal à la main
  (`rounded-xl bg-primary px-5 …`) au lieu d’utiliser `Button` — dans le tunnel
  de réservation, dans « Mes rendez-vous », dans la chronologie admin, dans
  l’activité, dans les formulaires de prestation ;
- **55 `<button>` bruts** contre seulement **35 `<Button>`** ;
- **cinq rayons différents** cohabitent sans règle : `rounded-xl` (124 usages),
  `rounded-2xl` (71), `rounded-full` (59), `rounded-3xl` (33), `rounded-lg` (21) ;
- **trois couleurs hexadécimales en dur** servent à afficher un prix —
  `text-[#806b4d]` dans le catalogue et dans le récapitulatif de réservation,
  `text-[#927b59]` dans le tunnel — soit trois teintes pour une seule intention ;
- la palette Tailwind brute est employée directement partout (`rose-500` 21 fois,
  `amber-950` 10 fois, `emerald-50` 10 fois) au lieu de jetons porteurs de sens ;
- les formulaires admin mélangent `FormField` et des `<label>` écrits à la main
  **à l’intérieur d’un même formulaire**.

Conséquence directe : deux boutons qui font la même chose n’ont ni la même
hauteur, ni le même rayon, ni le même comportement au focus. C’est ce qui donne
l’impression d’un site « pas fini », et c’est ce qui rend chaque écran suivant à
construire un peu plus coûteux.

**Recommandation.** Migrer méthodiquement, écran par écran, vers les primitives
existantes. Introduire des jetons sémantiques pour ce qui est aujourd’hui codé
en dur : une couleur de prix unique, un jeu `success` / `warning` / `info` /
`danger` remplaçant les usages directs de `emerald-*`, `amber-*` et `rose-*`, et
une règle de rayon par famille de conteneur (carte, champ, pastille). Aucun
nouveau composant n’est à inventer : le tableau des primitives de
`docs/systeme-visuel.md` suffit.

**Critères d’acceptation :**

- toute action ou lien d’action passe par `Button` ; les `<button>` restants sont
  uniquement des contrôles spécialisés (onglet, pastille de jour, case à cocher) ;
- tout champ de saisie passe par `FormField` et `formControlClass`, sans `<label>`
  manuel résiduel ;
- aucune couleur hexadécimale littérale ne subsiste dans `app/` ni `components/` ;
- les rayons proviennent des jetons `--radius-*` ; les valeurs arbitraires sont
  justifiées au cas par cas dans le code ;
- `docs/systeme-visuel.md` est mis à jour et décrit l’état réellement atteint,
  pas l’intention ;
- `pnpm check:com` passe sans nouvelle exception `biome-ignore`.

**Livré.** Les 160 teintes brutes et les 3 hexadécimales de prix sont remplacées
par des jetons sémantiques déclarés dans `app/globals.css` : rampes `brand`,
`success` et `warning` en cinq à six pas, plus `price`. Toutes les actions
passent par `Button`, `SubmitButton` ou `ConfirmDialog` ; les 28 `<label>`
manuels sont passés à `FormField`. `SubmitButton` repose désormais sur `Button`
au lieu de redéclarer son style, et ses douze appels ne le restylent plus à la
main. L’annulation d’un rendez-vous côté cliente, encore faite de deux petits
boutons alors que la v1 l’interdisait déjà, passe à `ConfirmDialog`.
`docs/systeme-visuel.md` décrit l’état atteint, y compris la convention de rayon
par famille de conteneur et la liste des contrôles qui restent légitimement des
`<button>` bruts.

**Deux décisions prises en cours de route.**

- Les quinze classes `dark:` posées sur la palette brute sont supprimées : le
  mode sombre n’est pas activable, aucun bloc `.dark` n’existant dans
  `app/globals.css`. Le document l’indique explicitement.
- La taille `sm` de `Button` valait `h-7`, soit 28 px : la migration a fait
  chuter 43 actions sous le seuil de 44 px du projet. `sm` conserve sa
  typographie compacte mais passe à `min-h-11`. Vérifié écran par écran : plus
  aucune action sous 44 px.

**Reste ouvert.** `text-brand` sur le fond clair mesure 3,60:1, sous le seuil AA
de 4,5. Ce n’est pas une régression — c’est l’ancien `rose-500`, repris à
l’identique — mais c’est désormais **une seule ligne** à changer pour les
21 usages : `--brand: oklch(0.575 0.246 16.439)` donne 4,54:1. La décision est
éditoriale, elle appartient à l’élément 3.

**Dépendances :** aucune ; socle des éléments 3, 5, 7 et 9.

### 3. Réparer les alignements et les tailles sur mobile — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Plusieurs défauts d’alignement sont visibles à l’œil nu
sur un téléphone :

- les deux boutons du hero, censés se partager la largeur à parts égales
  (`flex-1`), n’ont **pas la même largeur** à 430 px : 206 px contre 172 px.
  La cause supposée — le `shrink-0` de `Button` — s’est révélée fausse à la
  mesure : `flex-1` s’applique intégralement (`grow:1 shrink:1 basis:0%`). Le
  coupable est `min-width: auto`, valeur par défaut d’un élément flex, qui
  interdit à chaque bouton de descendre sous la largeur de son libellé ;
- les libellés des étapes du tunnel de réservation sont rendus en `text-[9px]`
  sur mobile, soit sous le seuil de lisibilité confortable ;
- la grille des indicateurs admin affiche cinq cartes sur deux colonnes avec une
  dernière carte qui s’étale sur toute la largeur (`last:col-span-2`), ce qui
  produit une rupture de rythme visuel ;
- `text-brand` mesure 3,60:1 sur le fond clair, sous le seuil AA de 4,5. Depuis
  l’élément 2, c’est une seule valeur à arbitrer pour les 21 sur-titres du site.

L’élément 2 a déjà réglé une partie du problème initial : les hauteurs d’action
ne se contredisent plus, elles proviennent toutes de `Button`, et aucune cible
tactile ne descend sous 44 px.

**Recommandation.** Traiter le reste comme une passe unique : corriger
l’interaction entre `shrink-0` et `flex-1` dans `Button`, remonter les libellés
d’étapes à une taille lisible quitte à les raccourcir, donner à la grille
d’indicateurs un nombre de cartes compatible avec deux colonnes, et trancher la
valeur de `--brand`.

**Critères d’acceptation :**

- dans une même rangée, deux actions de même niveau ont la même largeur et la
  même hauteur, à 320, 360 et 430 px ;
- aucun texte d’interface n’est rendu sous 11 px ;
- aucun écran public ni admin ne provoque de défilement horizontal aux trois
  largeurs de référence ;
- les cibles tactiles principales restent à 44 px minimum, conformément à
  `docs/systeme-visuel.md`.

**Livré.** Les deux boutons du hero s'empilent pleine largeur au doigt et
passent côte à côte à partir de `sm` : mesurés à 390 px chacun à 430 px de
large. Un jeton `text-2xs` (11 px) remplace les dix-neuf tailles `text-[8px]`
à `text-[10px]` du projet — plancher de lisibilité désormais explicite dans
`app/globals.css`. La grille d'indicateurs passe de cinq à quatre cartes : les
heures réservées deviennent la légende de l'occupation, dont elles sont le
numérateur, ce qui donne un 2×2 régulier sans perdre d'information. `--brand`
est assombri à `oklch(0.575 0.246 16.439)`, soit 4,54:1 sur le fond clair.
Vérifié écran par écran : aucun texte sous 11 px, aucun débordement horizontal.

**Correction d'un constat erroné.** La roadmap attribuait l'inégalité des
boutons au `shrink-0` de `Button`. La mesure a montré l'inverse : `flex-1`
s'applique intégralement et le blocage vient de `min-width: auto`. `Button` n'a
donc pas été touché.

**Dépendances :** éléments 1 et 2.

---

## L’agenda d’Arzu, d’un coup d’œil

### 4. Mettre la journée en cours en tête de l’agenda — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** C’est le point le plus important de ce backlog. Sur
téléphone, l’agenda admin présente aujourd’hui, dans cet ordre :

1. l’en-tête « Arbeauté / Agenda » ;
2. **cinq cartes d’indicateurs** — rendez-vous, heures réservées, chiffre prévu,
   occupation, absences ;
3. l’activité récente, **masquée sur mobile** ;
4. le sélecteur de semaine et ses sept pastilles de jours ;
5. l’en-tête de la journée sélectionnée ;
6. la légende « libre / prépa-rangement / fermeture » ;
7. **enfin** la liste des rendez-vous, sous le titre « Actions rapides » ;
8. puis la chronologie dessinée en pixels.

Autrement dit, l’information qu’Arzu vient chercher — ses rendez-vous du jour —
arrive en **septième position**. Les indicateurs de gestion, qu’elle consulte au
mieux une fois par semaine, occupent le premier écran.

**Recommandation.** Inverser la hiérarchie. À l’ouverture, l’écran affiche le
**prochain rendez-vous** en évidence, puis la **liste de la journée en cours**,
avec son heure, le nom de la cliente et la prestation. Le sélecteur de semaine
reste accessible mais compact. Les indicateurs et la chronologie détaillée
descendent sous la liste, ou se replient derrière une section dépliable. Le
libellé « Actions rapides », qui ne décrit pas son contenu, disparaît au profit
du nom de la journée.

**Critères d’acceptation :**

- sur un écran de 360 × 780 px, à l’ouverture de `/admin`, **au moins un
  rendez-vous du jour est visible sans défiler** — ou un message explicite
  indiquant qu’il n’y en a aucun ;
- le prochain rendez-vous à venir est identifiable immédiatement, avec le temps
  restant avant son début ;
- naviguer vers un autre jour puis revenir à aujourd’hui tient en une seule
  action ;
- l’agenda continue de charger la semaine entière en une seule série de
  requêtes : aucune requête supplémentaire par jour n’est introduite ;
- la route reste en rendu partiel, sans basculer en dynamique complet.

**Livré.** L'ordre mobile de `/admin` devient : titre compact, **prochain
rendez-vous**, sélecteur de semaine, journée sélectionnée, liste des
rendez-vous. Les indicateurs et l'activité passent sous l'agenda, et la
chronologie au pixel se replie derrière « Vue détaillée et créneaux libres ».
Le libellé « Actions rapides », qui ne décrivait pas son contenu, disparaît au
profit du nom de la journée. Vérifié à 360 × 780 : le premier rendez-vous du
jour est visible **sans défiler**, et une journée sans rendez-vous l'annonce
explicitement.

La carte du prochain rendez-vous affiche le délai restant en français courant
(« Dans 22 h 58 »), calculé côté client pour rester juste sans provoquer
d'écart d'hydratation, et rafraîchi toutes les trente secondes.
`formatAppointmentCountdown` vit dans `lib/admin/next-appointment.ts` et est
couvert par sept tests unitaires.

**Coût en requêtes.** Une seule requête bornée s'ajoute au `Promise.all`
existant — un `findFirst` sur le prochain rendez-vous confirmé — pour que la
carte reste juste même quand Arzu consulte une autre semaine. Aucune requête
par jour n'est introduite et `/admin` reste en `◐ Partial Prerender`.

**Dépendances :** aucune.

### 5. Rendre chaque rendez-vous actionnable en un geste — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Le numéro de téléphone de la cliente est affiché dans
l’agenda comme **du texte brut**, pas comme un lien : pour appeler quelqu’un qui
est en retard, Arzu doit sélectionner le numéro, le copier, ouvrir son
téléphone, le coller. Les actions de statut existent déjà mais sont noyées dans
la carte, et modifier un rendez-vous impose de passer par une page de détail.

**Recommandation.** Faire de chaque ligne de rendez-vous une unité autonome :
appeler la cliente en un appui (`tel:`), marquer « terminé » ou « absente »,
ouvrir le détail. Regrouper ces actions de façon identique dans la liste du jour
et dans la fiche, afin qu’Arzu n’ait pas deux gestes différents à mémoriser pour
la même intention.

**Critères d’acceptation :**

- appeler une cliente depuis l’agenda demande **un seul appui** ;
- lorsqu’aucun numéro n’est enregistré, l’absence est indiquée explicitement au
  lieu d’afficher une action inerte ;
- les actions de statut restent protégées par une confirmation lorsqu’elles sont
  difficiles à défaire, en réutilisant `ConfirmDialog` ;
- chaque action confirme visuellement son résultat, sans que la page ne semble
  s’être rechargée sans raison ;
- toutes les cibles atteignent 44 px et restent atteignables au pouce.

**Livré.** `CustomerCallButton` remplace le numéro affiché en texte brut :
un appui compose l'appel, et le lecteur d'écran annonce « Appeler Noé Henchoz
au +41 … ». Quand aucun numéro n'est enregistré, la ligne le dit — « Pas de
numéro enregistré », icône de téléphone barré — au lieu de laisser une action
inerte. Le même trio appeler / terminé / absence apparaît désormais dans la
liste de la journée et dans la fiche, où il était jusqu'ici absent pour les
rendez-vous confirmés.

Chaque changement de statut ouvre son `ConfirmDialog` comme avant, mais
confirme maintenant son résultat par un `AppToast` — « C'est enregistré. Le
rendez-vous est marqué comme terminé. » Sans lui, la page se rafraîchissait
sans rien annoncer.

**Nettoyage au passage.** La carte de la grille hebdomadaire de bureau portait
un paramètre `compact` jamais appelé avec `false` : la ligne de téléphone
qu'elle contenait n'a donc jamais été rendue. Le paramètre et sa branche morte
sont supprimés.

**Dépendances :** éléments 2 et 4.

### 6. Afficher l’activité récente sur mobile — ✅ Terminé

**Priorité : P0 · Effort : S · Nature : amélioration**

**Constat et valeur.** Le bloc « Activité récente » — qui annonce les
réservations, annulations et déplacements faits par les clientes — est enveloppé
dans un conteneur `hidden md:block` sur la page d’agenda. Sur téléphone, donc
dans 95 % des sessions, **Arzu ne le voit jamais** depuis son agenda. C’est
pourtant l’information la plus urgente : une annulation de dernière minute
change sa journée. Elle doit aujourd’hui penser à ouvrir l’onglet « Activité »,
alors qu’une pastille de compteur existe déjà dans la barre de navigation.

**Recommandation.** Rendre l’activité visible sur mobile, dans une forme
compacte adaptée : les changements non lus en premier, formulés en une phrase
complète (« Untel a annulé … prévu le … »), avec un accès direct au rendez-vous
concerné et la possibilité de tout marquer comme lu.

**Critères d’acceptation :**

- un changement non lu est visible depuis `/admin` sur mobile, sans ouvrir un
  autre onglet ;
- le nombre d’éléments non lus est cohérent entre l’agenda et la barre de
  navigation ;
- marquer comme lu met à jour les deux affichages sans rechargement complet ;
- lorsqu’il n’y a rien de nouveau, le bloc reste discret et n’occupe pas
  l’espace réservé à la journée en cours.

**Livré.** Le `hidden md:block` disparaît : l'aperçu complet est visible sur
téléphone, sous l'agenda. Au-dessus, une bande d'une seule ligne — « 2
nouveautés depuis votre dernier passage » — signale le non-lu dès l'ouverture
et s'efface entièrement quand il n'y a rien. `getActivityOverview` trie
désormais les non-lus en premier plutôt que par date seule. Vérifié : marquer
comme lu fait disparaître la bande **et** la pastille de la barre de
navigation dans le même rendu, sans rechargement complet.

**Arbitrage.** Une première version affichait aussi la phrase du dernier
changement et deux boutons. Mesurée à 360 × 780, elle repoussait le premier
rendez-vous du jour hors de l'écran — soit exactement ce que l'élément 4 vient
de corriger. La bande a donc été réduite à un signal : elle alerte, le détail
et le « tout marquer comme lu » restent dans l'aperçu et dans l'onglet
Activité.

**Dépendances :** élément 4.

### 7. Écrire l’administration en français simple — ✅ Terminé

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** L’interface d’administration expose son vocabulaire
interne : « Occupation », « Chiffre prévu », « Prépa / rangement », « horizon »,
« préavis », « pas des créneaux », « exception de disponibilité », « journal
d’audit », « anonymiser ». Aucun de ces termes ne se comprend sans explication
par quelqu’un qui n’a jamais administré de site.

S’y ajoute une ambiguïté franche : dans le formulaire de rendez-vous, le bouton
destructif s’appelle « **Annuler le rendez-vous** » et le dialogue de
confirmation propose lui aussi « **Annuler** » — qui ferme le dialogue sans rien
faire. Deux boutons voisins, le même mot, deux effets opposés.

**Recommandation.** Passer chaque écran admin en revue et réécrire les libellés
du point de vue d’Arzu, pas du modèle de données : ce qui se compte, ce que ça
change, ce qu’il faut faire. Chaque réglage reçoit une phrase d’explication
concrète avec un exemple. Le vocabulaire des actions destructives est levé de
toute ambiguïté (« Supprimer ce rendez-vous » face à « Revenir en arrière »).

**Critères d’acceptation :**

- aucun libellé d’interface n’emploie un terme technique sans le traduire ;
- chaque réglage de la page de réservation est accompagné d’un exemple concret
  (« un préavis de 2 h : une cliente ne peut pas réserver pour dans une heure ») ;
- deux actions voisines n’emploient jamais le même verbe pour des effets
  différents ;
- les messages d’erreur indiquent quoi faire ensuite, jamais uniquement ce qui a
  échoué ;
- les termes retenus sont cohérents entre l’admin, le site public et les
  e-mails.

**Livré.** [docs/vocabulaire.md](docs/vocabulaire.md) fixe les termes retenus et
liste les vingt-six formulations bannies avec leur remplaçant : « occupation »
devient « temps rempli », « chiffre prévu » devient « recette attendue »,
« journal d’audit » devient « historique des modifications », « anonymiser une
cliente » devient « effacer les coordonnées d’une cliente », « prépa / rangement »
devient « installation et rangement ». `AGENTS.md` renvoie à ce document avant
d’écrire le moindre libellé.

Les quatre règles de réservation portent désormais une phrase construite à
partir de la valeur enregistrée — « Avec 12 heures, une cliente qui regarde le
site à 8 h du matin ne peut rien prendre avant 20 h le jour même. » Ces phrases
vivent dans `lib/admin/booking-settings-wording.ts` et sont couvertes par dix
tests unitaires, dont un qui vérifie qu’au-delà de vingt-quatre heures la phrase
ne cite plus d’heure trompeuse. Au passage, les quatre `<label>` de cet écran,
qui avaient échappé à la migration de l’élément 2, passent à `FormField`.

L’ambiguïté du mot « annuler » est levée partout : le dialogue oppose
maintenant « Non, le garder » à « Oui, annuler ce rendez-vous ». Vingt et un
messages d’erreur sont réécrits pour dire quoi faire ensuite : « Cette heure est
déjà prise, temps d’installation et de rangement compris. Choisissez une autre
heure. »

**Réserve.** La cohérence avec les e-mails ne peut pas encore être constatée :
l’élément 11 n’est pas livré. Le vocabulaire est posé en amont, c’est à lui de
s’y conformer.

**Dépendances :** aucune ; fixe le vocabulaire que l’élément 11 devra suivre.

---

## Vitrine et tunnel de réservation

### 8. Refondre le premier écran mobile de la vitrine — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Le hero occupe une hauteur d’écran complète
(`min-h-svh`) avec un titre en taille fixe. Le résultat diffère mal selon la
taille du téléphone : à 360 px, « La beauté, avec attention. » se casse en
**quatre lignes** et remplit à lui seul le premier écran, tandis qu’à 430 px la
page est majoritairement occupée par du dégradé vide au-dessus et en dessous du
contenu. La photo d’Arzu apparaît comme une petite vignette carrée détachée dans
le coin, à laquelle le titre doit céder de la place via une marge droite figée.
Enfin, la pastille « Uniquement sur rendez-vous » et les deux boutons se suivent
sans partager d’alignement commun.

**Recommandation.** Reconstruire ce premier écran autour d’une seule question :
« qu’est-ce que je fais ici ? ». Titre plus compact et fluide, une phrase de
présentation, la photo d’Arzu intégrée à la composition plutôt que posée par
dessus, et **un appel à l’action dominant** — réserver — le second devenant
secondaire. Y annoncer la **prochaine disponibilité** donnerait au visiteur une
raison immédiate de continuer.

**Critères d’acceptation :**

- à 360 px, le titre, la phrase de présentation et le bouton « Prendre
  rendez-vous » sont visibles **sans défiler** ;
- les deux actions du hero partagent la même largeur et la même hauteur ;
- la photo ne contraint plus la largeur du titre par une marge codée en dur ;
- l’image reste dans le budget d’images des pages publiques et ne provoque aucun
  décalage de mise en page ;
- la page d’accueil reste servie depuis le CDN, sans invocation de fonction.

**Livré.** Le contenu est ancré en haut sur mobile au lieu d’être centré dans une
hauteur d’écran complète ; la pleine hauteur ne revient qu’à partir de `md`.
Mesuré à 360 × 620 : le titre commence à 168 px et le bouton « Prendre
rendez-vous » se termine à 460 px, donc **tout est visible sans défiler**, et la
section suivante affleure — le visiteur voit qu’il y a une suite.

La photo entre dans la composition : sur téléphone, une vignette ronde de 56 px
précède « Soins esthétiques à Bulle » et « Arzu Yurdakul ». Les marges droites
codées en dur (`pr-24`, `pr-28`, `pr-32`, `pr-36`) disparaissent, et le sur-titre
cesse de se casser sur « BULLE » tout seul. La grande photo reste au bureau.

Les deux actions passent par une grille à colonnes égales : **320 × 48 px chacune
à 360 px, 250 × 48 px chacune à 1280 px**. Elles restent empilées jusqu’à `lg`,
car côte à côte dans la colonne étroite du bureau « Prendre rendez-vous » venait
toucher ses bords. La pastille « Uniquement sur rendez-vous », qui était un
encadré concurrent de l’appel à l’action, devient une simple ligne en dessous.

**Deux pièges rencontrés.**

- Enveloppée dans un `Animate` en `hidden md:block`, la grande photo restait
  **invisible sur ordinateur** : l’observateur d’intersection ne se déclenche pas
  sur un élément né sans boîte, et l’opacité restait à 0. Le portrait est
  au-dessus de la ligne de flottaison — une entrée déclenchée au défilement n’a
  rien à déclencher — il se passe donc d’`Animate`.
- En `loading="eager"`, cette même photo se téléchargeait sur téléphone alors
  qu’elle y est en `display:none`. Passée en `lazy`, elle n’est plus demandée du
  tout : mesuré, le premier écran mobile ne charge plus que la vignette de
  **2,1 Kio**.

**Ce que je n’ai pas fait, et pourquoi.** La recommandation suggérait d’annoncer
la prochaine disponibilité dans le hero. Je m’en suis abstenu : les créneaux ne
peuvent pas être mis en cache — c’est la règle qui protège des doubles
réservations — donc l’afficher imposerait soit une lecture dynamique par
visiteur, qui ferait glisser `/` de `○ Static` à `◐` et coûterait une invocation
de fonction à chaque visite sur un plan Hobby, soit un chiffre potentiellement
faux. Les deux contredisent un critère de cet élément. L’appel à l’action, lui,
mène en un geste au tunnel qui affiche désormais la première heure libre.

**Dépendances :** éléments 1 et 3.

### 9. Raccourcir et clarifier le tunnel de réservation — ✅ Terminé

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** Le tunnel compte quatre étapes — prestation, créneau,
coordonnées, vérification. Le calendrier n’affiche par défaut que la semaine
courante, et la fonction « prochain créneau disponible » existe mais reste un
bouton parmi d’autres : une cliente qui ouvre la réservation un jour de
fermeture voit d’abord « L’institut est fermé ce jour-là ». Les libellés
d’étapes sont par ailleurs illisibles sur mobile, et l’en-tête de récapitulatif
affiche « Créneau **À** Choisir » à cause d’une capitalisation automatique
appliquée à une phrase entière.

**Recommandation.** Proposer d’emblée le prochain créneau disponible plutôt que
d’attendre que la cliente le cherche. Rendre les étapes lisibles et leur état
évident (faite, en cours, à venir). Vérifier que le récapitulatif reste exact à
chaque étape, y compris lorsqu’un créneau est perdu au profit d’une autre
cliente.

**Critères d’acceptation :**

- une cliente qui n’a aucune préférence de date peut réserver **sans changer de
  semaine manuellement** ;
- l’état de chaque étape est compréhensible sans couleur seule ;
- le récapitulatif n’affiche jamais une donnée obsolète après un retour arrière ;
- un créneau pris entre-temps produit un message qui explique quoi faire, et
  ramène au calendrier avec les créneaux à jour ;
- le parcours reste utilisable au clavier, dans l’ordre visuel.

**Livré.** Le tunnel se place tout seul sur la première journée qui a des heures
libres, au lieu d’ouvrir sur « L’institut est fermé ce jour-là ». La règle tient
en deux temps et **ne coûte aucune requête supplémentaire dans le cas courant** :
la semaine est déjà chargée, on y cherche le premier jour ouvert ; ce n’est que
si la semaine entière est fermée ou pleine qu’un appel va chercher la suivante,
une seule fois par prestation. Vérifié en fermant toute la semaine du 17 août :
le tunnel saute au 24, l’explique — « Rien de libre cette semaine-là. Voici le
prochain jour disponible : lundi 24 août 2026. » — et affiche les heures.

Le placement automatique s’arrête dès que la cliente touche au calendrier : à
partir de là, c’est elle qui décide.

Les quatre étapes ont maintenant **trois états distingués par la forme** et non
par la seule couleur : une coche pour ce qui est fait, un numéro plein pour
l’étape en cours, un numéro discret sur bordure pointillée pour la suite. Chaque
étape porte en plus son état en toutes lettres pour les lecteurs d’écran.

**Trois critères étaient déjà tenus, et je l’ai vérifié plutôt que supposé :**

- le récapitulatif ne garde rien d’obsolète — revenir à l’étape 1 et changer de
  soin le remet sur « Créneau à choisir » ;
- un créneau pris entre-temps ramène au calendrier rechargé avec un message qui
  dit quoi faire ;
- l’ordre du clavier suit l’ordre visuel : 26 éléments focalisables, aucune
  rupture, aucun `tabindex` positif.

**Dépendances :** éléments 2, 3 et 13.

### 10. Rendre la confirmation rassurante — ✅ Terminé

**Priorité : P1 · Effort : S · Nature : amélioration**

**Constat et valeur.** Faute d’envoi d’e-mail, l’écran de confirmation actuel est
obligé de compenser par des avertissements : un bandeau ambre « **Aucun e-mail de
confirmation ne sera envoyé** », un encart expliquant qu’il faut retenir son
e-mail et son téléphone pour retrouver son rendez-vous, un rappel d’ajouter le
rendez-vous à son calendrier. L’écran qui devrait rassurer est celui qui inquiète
le plus.

**Recommandation.** Une fois l’élément 11 livré, réécrire cet écran : confirmer
d’abord, indiquer que le détail vient d’être envoyé par e-mail, puis proposer
calmement les compléments utiles (ajout au calendrier, adresse, formulaire de
consentement s’il y en a un). Les avertissements disparaissent.

**Critères d’acceptation :**

- l’écran ne contient plus aucune mention négative sur l’absence d’e-mail ;
- l’adresse de destination de l’e-mail est rappelée, pour que la cliente repère
  une faute de saisie tout de suite ;
- l’ajout au calendrier et le formulaire de consentement restent accessibles ;
- l’impression du récapitulatif continue de fonctionner.

**Livré.** Les trois formulations négatives ont disparu : le bandeau ambre
« Aucun e-mail de confirmation ne sera envoyé », la phrase d’introduction de
l’étape « Vos coordonnées » et le chapeau de la page de réservation. À leur
place, un bloc vert rappelle l’adresse de destination — « Le détail part par
e-mail à … » — et dit quoi faire en cas de faute de saisie : appeler l’institut,
le rendez-vous étant enregistré de toute façon. L’ajout au calendrier, la copie
des détails, l’enregistrement en PDF et le formulaire de consentement restent en
place, simplement présentés comme des compléments et non comme un filet de
sécurité.

**Ce que l’écran sait, et ce qu’il ne sait pas.** L’envoi part avec `after()`,
donc l’écran ne peut pas connaître son issue : il annonce un départ, jamais une
réception. `createPublicAppointment` renvoie désormais `confirmationEmailTo`,
l’adresse réellement mise en file — `null` si aucun envoi n’est configuré ou si
le rendez-vous n’a pas d’adresse. L’écran s’appuie sur cette valeur, si bien
qu’il ne promet jamais un e-mail qui ne partira pas. Quand rien ne part, il
n’affiche simplement rien : le rendez-vous est confirmé dans les deux cas.
`describeConfirmationDelivery` et le filtrage de la mise en file sont couverts
par sept tests.

**Deux défauts trouvés par la vérification.**

- Une adresse longue mais réaliste
  (`marie-antoinette.vandenberghe@fournisseur-suisse-romand.ch`) sortait de son
  cadre vert et se faisait couper au bord de l’écran. `break-words` ne suffisait
  pas : dans un conteneur flex, seul `wrap-anywhere` autorise le texte à
  descendre sous sa largeur `min-content`.

  **Correction d’une affirmation.** Cette page a d’abord écrit que le débordement
  « provoquait un défilement horizontal ». C’est faux, et la mesure le montre :
  `maxScrollLeft` vaut 0 avec comme sans le correctif. Le texte débordait de
  83 px et était simplement tronqué. Ma mesure initiale comparait `scrollWidth` à
  `clientWidth`, dont l’écart de 8 px n’est que la barre de défilement verticale
  — un faux positif à ne pas reproduire.
- Resend répond **403** tant que le domaine n’est pas vérifié, et l’élément 11
  traduisait tout 403 par « la clé Resend a été refusée » — une fausse piste qui
  aurait envoyé Arzu vérifier sa clé alors que le problème est le domaine. Le
  domaine se reconnaît au message, pas au code : la traduction le teste d’abord,
  et 401 (clé) est désormais séparé de 403 (droit d’envoi).

**Le `capitalize` de cet écran est supprimé** : appliqué à la date entière, il
affichait « Mardi, 18 Août 2026 À 10:45 ». Les treize autres usages relèvent de
l’élément 13, et l’un d’eux — « Créneau À Choisir » — reste visible dans le
récapitulatif du tunnel.

**Dépendances :** élément 11.

---

## Confirmations et rappels par e-mail

### 11. Envoyer confirmations et rappels via Resend — ✅ Terminé

**Priorité : P1 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Aujourd’hui, une réservation ne laisse aucune trace en
dehors du navigateur de la cliente. Si elle ferme l’onglet sans lire l’écran de
confirmation, elle n’a plus que sa mémoire — et Arzu récupère les appels
« j’avais rendez-vous quand, déjà ? », ainsi que les absences. Symétriquement,
Arzu doit ouvrir l’application pour savoir si quelqu’un a réservé ou annulé.
L’offre gratuite de Resend, déployable depuis Vercel, lève cette limite sans
coût récurrent.

**Recommandation.** Envoyer à la cliente une confirmation à la réservation, ainsi
qu’un message lors d’un déplacement ou d’une annulation, et un rappel avant le
rendez-vous. Envoyer à Arzu un récapitulatif quotidien des rendez-vous du
lendemain. L’envoi est **strictement secondaire** : il se produit après que le
rendez-vous est enregistré en base, et un échec d’envoi ne doit jamais annuler ni
faire échouer une réservation. La clé d’API est validée dans `lib/core/env.ts`
avec les autres variables, et documentée dans `.env.example`.

**Critères d’acceptation :**

- une panne totale de Resend n’empêche aucune réservation, aucun déplacement,
  aucune annulation ;
- un échec d’envoi est tracé côté administration, avec la possibilité de
  renvoyer le message ;
- les e-mails sont en français `fr-CH`, lisibles en texte brut comme en HTML, et
  rappellent la date, l’heure, la prestation, le prix et l’adresse ;
- aucune donnée de la cliente ne transite en dehors de ce qui est nécessaire à
  l’envoi ;
- la limite de l’offre gratuite est surveillée et un dépassement est visible
  avant qu’il ne bloque les envois ;
- les envois automatiques ne dépendent d’aucune tâche planifiée payante.

**Livré.** `lib/email/` envoie par Resend en `fetch` direct, sans SDK. Le
découpage suit la contrainte : `templates.ts` est pur et couvert par des tests,
`client.ts` ne connaît que l’enveloppe et abandonne après dix secondes,
`send.ts` écrit une ligne `EmailDelivery` par tentative et **ne lève jamais**,
`notifications.ts` met l’envoi en file avec `after()` — la cliente voit sa
confirmation sans attendre Resend.

Quatre messages à la cliente : confirmation, déplacement, annulation, rappel de
la veille. Un récapitulatif du soir part à Arzu. Les deux derniers partagent
l’unique tâche planifiée déclarée dans `vercel.json`, la seule que le plan
Hobby autorise. `/admin/emails` montre chaque envoi, traduit l’échec en une
phrase actionnable — le JSON du fournisseur reste replié dessous — et propose
de renvoyer, le corps étant reconstruit depuis le rendez-vous plutôt que
stocké.

**Vérifié en conditions réelles.** Réservation sans clé Resend : confirmée,
aucune trace parasite. Réservation avec clé : confirmée, appel réel à Resend,
refus 422 tracé, bouton « Renvoyer » fonctionnel. Le quota est compté sur les
envois réussis et affiché avant d’être atteint.

**Une panne trouvée par la vérification.** `RESEND_FROM` était validé par
`z.email()`, qui refuse la forme « Nom <adresse> » — celle qu’attend Resend, et
celle que documentait `.env.example`. L’erreur remontait à l’import de
`env.ts` : **toutes les pages du site renvoyaient 500**. La validation est
devenue tolérante, une adresse mal formée désactive les e-mails au lieu de
casser le site, et `tests/core/email-config.test.ts` verrouille le cas.

**Reste à faire côté exploitation.** Le domaine `arbeaute-bulle.ch` doit finir
sa propagation DNS chez Resend ; tant qu’elle n’est pas terminée, Resend
n’accepte que vos propres adresses. Les quatre variables doivent être ajoutées
dans Vercel, `CRON_SECRET` étant injecté automatiquement dès que le cron est
déclaré.

**Dépendances :** aucune ; débloque l’élément 10.

---

## Fiabilité, cohérence et garde-fous

### 12. Supprimer et bannir les tests de bout en bout — ✅ Terminé

**Priorité : P0 · Effort : S · Nature : retrait**

**Constat et valeur.** La recette Playwright introduite par le commit `95ac509`
ajoute un navigateur à installer, une base PostgreSQL éphémère, des captures de
référence à régénérer et deux étapes de CI, pour un projet à une seule
praticienne. Le coût d’entretien dépasse le bénéfice : les captures deviennent
fausses au premier changement de police ou de bouton — c’est-à-dire dès
l’élément 1 de ce backlog. La décision est de **retirer entièrement cette
approche et de ne pas la refaire**.

**Recommandation.** Supprimer `tests/e2e/` et ses captures, `playwright.config.ts`,
`docker-compose.e2e.yml`, `scripts/run-e2e-local.sh`, la dépendance
`@playwright/test`, les scripts `test:e2e*` de `package.json`, l’exclusion
devenue inutile dans `vitest.config.ts`, les étapes E2E de
`.github/workflows/ci.yml`, les entrées correspondantes de `.gitignore` et les
sections concernées du `README.md`. Inscrire ensuite la règle **dans `AGENTS.md`**
— donc dans `CLAUDE.md`, qui en est un lien symbolique — pour que ni un humain ni
un agent ne la réintroduise.

Sont **conservés** : `scripts/verify-build-quality.ts`, qui analyse la sortie de
`next build` (coquilles statiques, budgets JavaScript et images) et n’est pas un
test de bout en bout, ainsi que `tests/quality/service-worker.test.ts`, qui est
un test Vitest ordinaire.

**Critères d’acceptation :**

- aucune occurrence de « playwright » ou « e2e » ne subsiste dans le code, la
  configuration, la CI ou la documentation ;
- `pnpm check:com` s’exécute sans étape de navigateur et reste la porte de
  qualité unique ;
- la CI ne télécharge plus aucun navigateur ;
- `AGENTS.md` énonce explicitement l’interdiction et sa raison ;
- `README.md` décrit la stratégie de test réelle : Vitest, plus les vérifications
  de build.

**Livré.** `tests/e2e/`, ses quatre captures de référence, `playwright.config.ts`,
`docker-compose.e2e.yml` et `scripts/run-e2e-local.sh` sont supprimés, avec la
dépendance `@playwright/test`, les trois scripts `test:e2e*`, l’exclusion
devenue inutile de `vitest.config.ts`, les trois étapes E2E de la CI et les deux
entrées de `.gitignore`. `AGENTS.md` porte désormais une section **« No
end-to-end tests — do not add any »** qui nomme les outils interdits, explique
pourquoi la recette a été retirée et indique quoi faire à la place. `README.md`
décrit la stratégie réelle.

**Un piège de gestionnaire de paquets.** `next` déclare `@playwright/test` en
peer *optionnel* : retirer la dépendance ne suffit pas, pnpm continue de la
résoudre tant que le lockfile n’est pas re-résolu. `pnpm-workspace.yaml` déclare
donc `ignoredOptionalDependencies`, et le lockfile a été régénéré — au prix du
rafraîchissement d’une quarantaine de paquets transitifs, isolé dans son propre
commit.

**Conservés.** `scripts/verify-build-quality.ts`, qui lit la sortie de
`next build`, et `tests/quality/service-worker.test.ts`, qui est un test Vitest.

**Dépendances :** aucune.

### 13. Éliminer les incohérences visibles par une non-technicienne — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Quelques défauts isolés suffisent à faire douter de la
fiabilité de l’ensemble, surtout chez quelqu’un qui n’a pas les repères pour
distinguer une coquille d’un vrai problème. Le cas emblématique : la mise en
majuscules automatique appliquée à une phrase entière produit « **Créneau À
Choisir** » dans le récapitulatif de réservation. Cette mise en majuscules est
employée à quatorze endroits, dont certains portent sur des phrases et non sur un
seul mot — d’autres occurrences du même défaut sont donc probables sur les dates
longues. S’y ajoutent des messages d’erreur qui décrivent la cause technique sans
dire quoi faire.

**Recommandation.** Passer en revue les quatorze usages et ne conserver la mise
en majuscules que sur des valeurs d’un seul mot. Puis relire l’ensemble des
messages destinés aux clientes et à Arzu selon une règle unique : dire ce qui
s’est passé, puis l’action suivante. Chaque correction est verrouillée par un
test Vitest sur la fonction de formatage ou de message concernée — ces tests
remplacent la couverture perdue avec l’élément 12.

**Critères d’acceptation :**

- aucune phrase de l’interface n’est rendue avec une majuscule à chaque mot ;
- les dates longues s’affichent selon les conventions `fr-CH` sur tous les
  écrans ;
- chaque message d’erreur visible par une cliente ou par Arzu propose une action
  suivante ;
- les fonctions de formatage de date, d’heure, de prix et de libellé de
  prestation sont couvertes par des tests unitaires ;
- aucun test ajouté ne nécessite de base de données ni de navigateur.

**Livré.** Les quatorze mises en majuscules automatiques sont supprimées : à la
mesure, **aucune ne portait sur un mot isolé**, toutes portaient sur une date ou
une phrase. `capitalizeFirst` les remplace, et `docs/systeme-visuel.md` interdit
désormais la classe CSS `capitalize`. « Créneau À Choisir » est redevenu
« Créneau à choisir ».

**Une même date s'écrivait de quatre façons.** En `fr-CH`, ICU intercale une
virgule dès que le jour de la semaine et l'année cohabitent, et une autre devant
l'heure. Selon l'écran, le même rendez-vous s'affichait « lundi, 17 août 2026 à
14:00 », « lun. 17 août 2026, 14:00 », « lundi 17 août à 14:00 » ou
« lundi 17 août 2026 ». Trois gabarits partagés remplacent les quinze
constructions locales : `formatLongDate`, `formatAppointmentDate` et
`formatCompactMoment`, tous sans virgule et avec « à » devant l'heure.

**Un prix pouvait s'afficher « 75,5 CHF ».** Le formateur *numérique* `fr-CH`
met une virgule décimale et supprime le zéro final ; le formateur *monétaire*
écrit « 75.50 ». Les onze copies de la mise en forme des prix sont remplacées
par un `formatPrice` unique, monétaire, qui laisse les francs entiers sans
décimale et en donne exactement deux sinon. Le défaut n'était pas encore visible
au catalogue actuel — tous les prix sont ronds — mais il attendait la première
prestation à 75.50.

**Vocabulaire.** Douze occurrences de « email » côtoyaient « e-mail » ;
« snapshots » et « propager » — le vocabulaire de la base — étaient lus par Arzu
sur sa fiche cliente ; « exception », « chevauche », « occurrence » et « hors
horaires » subsistaient malgré l'élément 7. Tous sont remplacés, et
`docs/vocabulaire.md` gagne quatre entrées et deux règles : une donnée, une seule
écriture ; jamais de majuscule à chaque mot.

**Messages d'erreur.** Quinze messages se contentaient de constater — « Ce
rendez-vous est invalide. », « La demande est invalide. », « Cette période ne
peut plus être supprimée. » Chacun dit maintenant quoi faire ensuite. Exemple :
« Ce rendez-vous tombe hors ouverture, ou se superpose à une fermeture.
Choisissez une autre heure, ou ouvrez ce jour dans « Jours particuliers ». »

**Tests.** `tests/reservation/formatting.test.ts` couvre les trois gabarits de
date, l'heure, la majuscule initiale, le prix et le libellé de prestation —
onze cas, dont l'ancrage sur `Europe/Zurich` en heure d'hiver comme en heure
d'été. Aucun ne demande de base de données ni de navigateur. La suite passe de
233 à 244 tests.

**Deux corrections d'attentes, pas de code.** Mes premières assertions sur le
prix étaient fausses : `fr-CH` sépare bien les milliers par une apostrophe et
colle le sigle par une espace insécable. Le code avait raison, les tests non.

**Dépendances :** élément 12 pour la stratégie de test.

---

## Ordre de pilotage recommandé

Sans calendrier, mais avec un enchaînement qui évite de refaire deux fois le même
travail :

Ce backlog est clos. L’ordre suivi aura été : les fondations visuelles (1, 2, 3),
puis l’agenda d’Arzu (4, 5, 6, 7), puis les garde-fous (12), les e-mails (11) et
la confirmation qu’ils débloquaient (10), la chasse aux incohérences (13), et
enfin la vitrine et le tunnel (8, 9) — qui ont hérité des formateurs, des jetons
et du vocabulaire posés par tout le reste.

**Ce qui reste, côté exploitation et non côté code** : terminer la vérification du
domaine `arbeaute-bulle.ch` chez Resend, et ajouter `RESEND_API_KEY`,
`RESEND_FROM` et `ADMIN_NOTIFICATION_EMAIL` dans Vercel — `CRON_SECRET` étant
injecté dès que la tâche planifiée est déclarée.

Chaque livraison conserve les invariants de sécurité, de cache, de fuseau horaire
et de concurrence rappelés en tête de document.
