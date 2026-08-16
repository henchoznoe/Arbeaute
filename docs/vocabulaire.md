# Vocabulaire de l’interface

Arzu n’a jamais administré de site, et ses clientes non plus. Aucun écran ne doit
donc employer le vocabulaire du modèle de données. Ce document fixe les termes
retenus : l’administration, le site public et, à terme, les e-mails de
l’élément 11 emploient les mêmes.

## Règle générale

Un libellé décrit **ce que la personne voit ou fait**, pas ce que la base
enregistre. En cas de doute, la formulation qui se lit à voix haute sans
explication l’emporte, même si elle est plus longue.

## Termes bannis et leurs remplaçants

| Ne plus écrire | Écrire |
| --- | --- |
| Préavis minimum | Combien de temps à l’avance réserver |
| Horizon de réservation | Jusqu’à quand on peut réserver |
| Délai de modification | Jusqu’à quand une cliente peut changer son rendez-vous |
| Pas des créneaux | Espacement des heures proposées |
| Occupation | Temps rempli |
| Chiffre prévu | Recette attendue |
| Absences | Clientes non venues |
| Indicateurs de la semaine | Votre semaine en chiffres |
| Prépa / rangement | Installation et rangement |
| Statut métier | Appeler ou noter ce qui s’est passé |
| Journal d’audit | Historique des modifications |
| Journal admin | Mes modifications |
| Acteur · Entité | Qui · Quoi |
| Anonymiser une cliente | Effacer les coordonnées d’une cliente |
| Anonymisation | Coordonnées effacées |
| Archivage | Mise de côté |
| Réorganisation | Ordre changé |
| Exports CSV | Télécharger vos données |
| Exception horaire | Jour particulier |
| Horaire hebdomadaire | Horaire de la semaine |
| Origine (d’un rendez-vous) | Prise par |
| Série finie | Répéter ce rendez-vous |
| Occurrence | Rendez-vous, ou date |
| Hors horaires | Hors ouverture |
| Chevauche | Se superpose à |

Restent tels quels parce qu’ils appartiennent au français courant et que
l’interface les enseigne d’elle-même : rendez-vous, prestation, créneau, soin,
cliente, confirmé, terminé, annulé.

## Réglages : toujours un exemple concret

Un nombre seul ne se comprend pas. Chaque réglage de la page des règles de
réservation est accompagné d’une phrase construite à partir de la valeur
enregistrée — voir `lib/admin/booking-settings-wording.ts`, couvert par
`tests/admin/booking-settings-wording.test.ts`.

> 12 heures → « Avec 12 heures, une cliente qui regarde le site à 8 h du matin
> ne peut rien prendre avant 20 h le jour même. »

Ces phrases ne prétendent jamais calculer un jour de la semaine : seul le moteur
de disponibilité sait le faire, et une phrase fausse est pire qu’une phrase
générale.

## Actions destructives

Deux actions voisines n’emploient **jamais le même verbe** pour des effets
opposés. Le cas historique : un bouton « Annuler le rendez-vous » à côté d’un
« Annuler » qui fermait le dialogue sans rien faire.

La règle : le bouton qui agit reprend l’action au complet, celui qui renonce dit
qu’il renonce.

| Déclencheur | Confirmer | Renoncer |
| --- | --- | --- |
| Annuler le rendez-vous | Oui, annuler ce rendez-vous | Non, le garder |
| Annuler (côté cliente) | Annuler le rendez-vous | Garder mon rendez-vous |
| Effacer les coordonnées | Effacer définitivement ces coordonnées | Annuler |

## Messages d’erreur

Un message dit **ce qui s’est passé puis quoi faire ensuite**. « Vérifiez les
informations saisies » ne suffit pas ; « Corrigez les champs signalés, puis
réessayez » indique le geste.

Quand rien ne dépend de l’utilisatrice — une panne — le message le dit et
propose l’action réaliste : réessayer, ou prévenir le développeur.
