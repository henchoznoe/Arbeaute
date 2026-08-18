# Vocabulaire de l’interface

Arzu n’a jamais administré de site, et les personnes qui réservent non plus.
Aucun écran ne doit donc employer le vocabulaire du modèle de données. Ce
document fixe les termes retenus : l’administration, le site public et les
e-mails emploient les mêmes.

## Règle générale

Un libellé décrit **ce que la personne voit ou fait**, pas ce que la base
enregistre. En cas de doute, la formulation qui se lit à voix haute sans
explication l’emporte, même si elle est plus longue.

## Termes bannis et leurs remplaçants

| Ne plus écrire | Écrire |
| --- | --- |
| Préavis minimum | Combien de temps à l’avance réserver |
| Horizon de réservation | Jusqu’à quand on peut réserver |
| Délai de modification | Jusqu’à quand un rendez-vous peut être changé |
| Pas des créneaux | Espacement des heures proposées |
| Occupation | Temps rempli |
| Chiffre prévu | Recette attendue |
| Absences | Rendez-vous non honorés |
| Indicateurs de la semaine | Votre semaine en chiffres |
| Prépa / rangement | Installation et rangement |
| Statut métier | Appeler ou noter ce qui s’est passé |
| Journal d’audit | Historique des modifications |
| Journal admin | Mes modifications |
| Acteur · Entité | Qui · Quoi |
| Anonymiser une cliente | Effacer les coordonnées d’une personne |
| Anonymisation | Coordonnées effacées |
| Archivage | Mise de côté |
| Réorganisation | Ordre changé |
| Exports CSV | Télécharger vos données |
| Exception horaire | Jour particulier |
| Horaire hebdomadaire | Horaire de la semaine |
| Fiche | Client |
| Confirmé · Terminé · Annulé · Absence (en tête de client) | Visites · Dernière venue · Soin habituel · Revient |
| Visites réalisées | Visites |
| Récapitulatif du soir | Bilan de la semaine |
| Chiffre réalisé | Montant réalisé |
| Origine (d’un rendez-vous) | Prise par |
| Série finie | Répéter ce rendez-vous |
| Occurrence | Rendez-vous, ou date |
| Hors horaires | Hors ouverture |
| Chevauche | Se superpose à |
| Snapshot | Le nom et le prix d’alors |
| Propager les coordonnées | Reporter sur ses rendez-vous à venir |
| Exception (bouton, phrase) | Jour particulier |
| Email | E-mail |

Restent tels quels parce qu’ils appartiennent au français courant et que
l’interface les enseigne d’elle-même : rendez-vous, prestation, créneau, soin,
confirmé, terminé, annulé.

## Ne genrez personne

L’institut reçoit aussi des hommes. Or toute l’interface disait « cliente », et
les commentaires du code avec elle. La règle : **on reformule, on ne remplace
pas**. Ni masculin générique (« le client »), ni point médian (« client·e »), que
les lecteurs d’écran ânonnent. La phrase tourne autour du rendez-vous, de la
fiche ou de la personne — et se lit à voix haute sans buter.

| Ne plus écrire | Écrire |
| --- | --- |
| la cliente ne pourra plus le déplacer | le rendez-vous ne pourra plus être déplacé |
| une cliente qui regarde le site | quelqu’un qui regarde le site |
| les clientes, vos clientes | les personnes qui réservent, votre clientèle |
| Fiche cliente | Client |
| Cliente trouvée · Aucune cliente trouvée | Client trouvé · Aucun client trouvé |
| Clientes non venues | Rendez-vous non honorés |
| Cliente sans nom | Sans nom |
| Marquer cette cliente comme absente | Noter une absence |
| Cliente anonymisée | Coordonnées effacées |
| Reprendre une cliente existante | Reprendre un client existant |
| Effacer les coordonnées d’une cliente | Effacer les coordonnées d’une personne |
| Historique des activités clientes | Historique de l’activité |

Deux exceptions : Arzu, qui est une personne réelle — « une seule praticienne »
reste juste —, et le mot « clientèle », collectif et sans genre porté sur les
personnes.

### « Client » est retenu, « cliente » reste banni

L’interface disait « fiche », mot d’un vocabulaire administratif qu’Arzu
n’emploie pas : elle parle de ses clients. Le terme est donc **« client »**, à
sa demande explicite, y compris dans les commentaires du code.

Ce que la règle ci-dessus continue d’interdire, elle l’interdit toujours :
**« cliente » et « clientes » ne réapparaissent nulle part**, et c’est ce que
`tests/quality/wording.test.ts` vérifie — son motif exige la lettre finale,
« client » et « clients » passent donc sans que la garde ne se relâche.

Une phrase longue préfère toujours tourner autour de la personne ou du
rendez-vous plutôt que d’aligner les « le client » : « le rendez-vous ne pourra
plus être déplacé » reste meilleur que « le client ne pourra plus le déplacer ».
Le mot sert d’étiquette — un titre, un bouton, un onglet —, pas de sujet
grammatical par défaut.

`tests/quality/wording.test.ts` échoue si le mot réapparaît dans `app/`,
`components/` ou `lib/`.

## Réglages : toujours un exemple concret

Un nombre seul ne se comprend pas. Chaque réglage de la page des règles de
réservation est accompagné d’une phrase construite à partir de la valeur
enregistrée — voir `lib/admin/booking-settings-wording.ts`, couvert par
`tests/admin/booking-settings-wording.test.ts`.

> 12 heures → « Avec 12 heures, quelqu’un qui regarde le site à 8 h du matin ne
> peut rien prendre avant 20 h le jour même. »

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
| Annuler (depuis le site) | Annuler le rendez-vous | Garder mon rendez-vous |
| Effacer les coordonnées | Effacer définitivement ces coordonnées | Annuler |

## Messages d’erreur

Un message dit **ce qui s’est passé puis quoi faire ensuite**. « Vérifiez les
informations saisies » ne suffit pas ; « Corrigez les champs signalés, puis
réessayez » indique le geste.

Quand rien ne dépend de la personne qui lit — une panne — le message le dit et
propose l’action réaliste : réessayer, ou prévenir le développeur.

## Une donnée, une seule écriture

Une même information ne doit pas s’écrire de deux façons selon l’écran : c’est
ce qui fait douter quelqu’un qui n’a pas les repères pour distinguer une
coquille d’une vraie erreur. Les mises en forme partagées sont donc les seules
autorisées, et elles sont couvertes par `tests/reservation/formatting.test.ts`.

| Donnée | Fonction | Rendu |
| --- | --- | --- |
| Date longue | `formatLongDate` | lundi 17 août 2026 |
| Date et heure | `formatAppointmentDate` | lundi 17 août 2026 à 14:00 |
| Date et heure, en liste | `formatCompactMoment` | lun. 17 août 2026 à 14:00 |
| Heure seule | `formatSlotTime` | 14:00 |
| Prix | `formatPrice` | 30 CHF · 75.50 CHF · 1'250 CHF |

Deux pièges que ces fonctions existent pour éviter :

- **La virgule d’ICU.** En `fr-CH`, dès que le jour de la semaine et l’année
  cohabitent, ICU intercale une virgule — « lundi, 17 août 2026 » — et une autre
  devant l’heure. Ce n’est pas l’usage français et cela donnait quatre écritures
  différentes d’une même date. Les formateurs la retirent.
- **Le séparateur décimal.** Le formateur *numérique* `fr-CH` écrit « 75,5 », le
  formateur *monétaire* écrit « 75.50 ». Un prix passe par le second.

## La majuscule à chaque mot est interdite

La classe CSS `capitalize` met une majuscule à **chaque** mot : appliquée à une
phrase elle produisait « Créneau À Choisir », appliquée à une date « Lundi, 17
Août 2026 ». Elle n’est plus employée nulle part. Pour une majuscule initiale,
`capitalizeFirst` de `lib/utils/format.ts`.
