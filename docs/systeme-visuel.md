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

## Primitives

| Primitive | Usage | Variantes |
| --- | --- | --- |
| `Button` | Actions et liens principaux | default, outline, secondary, ghost, destructive, link |
| `FormField` | Libellé, aide et erreur d’un champ | requis ou facultatif |
| `formControlClass` | `input`, `select` et `textarea` | normal, invalide, désactivé |
| `StatusBadge` | État toujours accompagné d’un texte | neutral, info, success, warning, danger |
| `navigationItemBaseClass` | Base des navigations publiques et admin | ligne, barre basse ou onglet actif |
| `ConfirmDialog` | Mutation destructive ou difficile à annuler | titre, conséquence, annuler, confirmer |
| `AppToast` | Retour bref après une action asynchrone | success, danger |
| `EmptyState` | Collection ou journée sans contenu | icône, explication, action facultative |

## Confirmation destructive

Le déclencheur conserve un libellé explicite. Le dialogue reçoit le focus,
annonce son titre et sa description, bloque l’arrière-plan et rend « Annuler »
accessible avant l’action destructive. Une confirmation intégrée sous forme de
deux petits boutons ne doit plus être créée localement.

## Audit de livraison du point 23

- Navigation public/admin : focus visible, cibles principales de 44 px et safe
  areas vérifiées à 320, 390 et 1440 px.
- Formulaires réservation/admin : zoom texte mobile évité par une taille de
  police de 16 px, erreurs textuelles et états d’envoi annoncés.
- Badges d’activité : nombre et libellé accessibles, pas uniquement une pastille.
- Suppression de prestation et annulation admin : dialogue accessible commun.
- États vides : composant commun dans l’activité et la chronologie admin.
- Mouvement réduit : animations et défilement doux neutralisés globalement.
