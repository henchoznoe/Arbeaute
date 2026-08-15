# Roadmap produit et UX — Arbeauté

## Objectif

Ce backlog fait évoluer le site vitrine, la réservation en ligne et la console
d’administration autour d’un usage principalement mobile. Il part du système
actuel, qui fournit déjà un catalogue administrable, un moteur de disponibilités,
la réservation sans compte, l’espace « Mes rendez-vous », un agenda admin, deux
PWA et des protections solides contre les chevauchements.

La priorité est de réduire les manipulations quotidiennes d’Arzu, de rendre le
choix d’un soin plus rapide pour les clientes et de consolider les données sans
augmenter les frais récurrents.

### Contraintes permanentes

- Interface et contenus en français `fr-CH`, devise CHF et fuseau
  `Europe/Zurich`.
- Une seule praticienne et une seule prestation par rendez-vous.
- Expérience mobile-first, avec des cibles tactiles d’au moins 44 px.
- Aucun email, SMS, paiement en ligne, abonnement de monitoring ou autre service
  externe payant.
- Conservation de Vercel Hobby et de la stratégie Cache Components : chaque
  route garde une coquille statique et les lectures dynamiques restent isolées.
- Conservation du chargement groupé des disponibilités, des transactions
  sérialisables et de la contrainte PostgreSQL anti-chevauchement.

## Lecture du backlog

**Statuts :** ✅ terminé · 🟡 en cours · ⏳ prêt à démarrer · 🔒 bloqué par
une ou plusieurs dépendances. Le statut figure directement dans chaque titre et
est réévalué après chaque livraison.

### État actuel

| Statut | Éléments |
| --- | --- |
| ✅ Terminés | 1 à 13, 19 et 21 à 23 |
| 🟡 En cours | 24, enrichi progressivement à chaque livraison |
| ⏳ Prêt à démarrer | 14 à 17 et 20 |
| 🔒 Bloqués | 18 |

**Prochain élément recommandé : 14.** Ses dépendances sont terminées et la
recherche globale apporte le prochain gain P0 dans l’usage quotidien de
l’administration. Les éléments 15 à 17 et 20 peuvent aussi démarrer ; l’élément
18 attend encore le 16.

- **Priorité P0** : corrige une friction importante ou prépare plusieurs autres
  éléments.
- **Priorité P1** : apporte un gain métier net après les fondations P0.
- **Priorité P2** : amélioration utile, mais non bloquante.
- **Effort S** : changement localisé ; **M** : plusieurs composants ou une petite
  évolution de données ; **L** : évolution transverse avec migration et tests.
- **Nature** distingue une amélioration d’une capacité existante d’une nouvelle
  fonctionnalité.

---

## Site vitrine et découverte des prestations

### 1. Rendre le catalogue filtrable et directement réservable — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Les prestations sont présentées dans une longue succession
de cartes. Sur téléphone, trouver un soin précis exige beaucoup de défilement et
la cliente doit ensuite le rechercher une seconde fois dans le tunnel de
réservation.

**Recommandation.** Ajouter une recherche locale, des pastilles de catégories
collantes et un bouton « Réserver » sur chaque prestation. Le filtrage doit être
effectué côté client à partir du catalogue déjà chargé, sans lecture de base de
données supplémentaire.

**Critères d’acceptation :**

- une prestation est trouvable par son nom, sa catégorie ou un mot de sa
  description ;
- le changement de catégorie ne recharge pas la page et conserve la position de
  lecture ;
- « Réserver » ouvre le tunnel avec la bonne prestation présélectionnée ;
- le catalogue reste lisible et utilisable sans JavaScript grâce à son rendu
  initial complet.

**Dépendances :** élément 5 pour la présélection dans le tunnel.

### 2. Installer un appel à la réservation persistant sur mobile — ✅ Terminé

**Priorité : P0 · Effort : S · Nature : amélioration**

**Constat et valeur.** Le bouton de réservation disparaît pendant la lecture des
prestations, de la présentation d’Arzu ou du contact. Le menu mobile permet de le
retrouver, mais ajoute une manipulation à l’action principale du site.

**Recommandation.** Ajouter une barre d’action compacte en bas d’écran, respectant
la safe area iOS, avec « Réserver » comme action principale et un accès discret à
« Mes rendez-vous ». Elle disparaît dans le tunnel, l’espace client, les pages
légales et l’administration.

**Critères d’acceptation :**

- l’action reste accessible au pouce sans masquer le contenu ni la bannière PWA ;
- aucun doublon visuel n’apparaît lorsque le bouton du hero ou du contact est à
  l’écran ;
- la navigation clavier, le focus et les lecteurs d’écran identifient clairement
  les deux actions.

**Dépendances :** élément 23 pour les règles communes de navigation et de safe
area.

### 3. Enrichir les informations utiles avant de réserver un soin — ✅ Terminé

**Priorité : P1 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Le modèle `Service` ne contient qu’une description libre,
une image et éventuellement un formulaire de consentement. Les informations de
préparation, contre-indications, résultats attendus et entretien sont donc
mélangées ou absentes, ce qui augmente les questions adressées directement à
Arzu.

**Recommandation.** Ajouter des champs structurés facultatifs pour la préparation,
les contre-indications, l’après-soin et une FAQ courte. Les afficher dans un
accordéon mobile depuis le catalogue ou sur une page de prestation statique
alimentée par le cache du catalogue. Le PDF de consentement reste téléchargeable
depuis le même écran.

**Critères d’acceptation :**

- Arzu peut modifier ces contenus depuis la fiche admin d’une prestation ;
- les sections vides ne sont jamais rendues ;
- les contenus structurés sont disponibles avant la confirmation du rendez-vous ;
- une modification invalide immédiatement le tag du catalogue sans rendre la
  page publique entièrement dynamique.

**Dépendances :** élément 23 pour le composant d’accordéon et les états de contenu.

### 4. Renforcer l’identité visuelle et les preuves de confiance — ✅ Terminé

**Priorité : P2 · Effort : M · Nature : amélioration**

**Constat et valeur.** Le site est cohérent et élégant, mais le hero repose surtout
sur le texte, les photos de prestations sont petites et la carte interactive
occupe une grande hauteur mobile. La vitrine explique peu ce qui différencie
Arbeauté avant d’afficher les tarifs.

**Recommandation.** Faire évoluer le hero avec un visuel réel optimisé, ajouter un
petit bloc de réassurance éditoriale et une galerie limitée de résultats ou de
l’institut. Remplacer l’iframe cartographique mobile par un aperçu léger ouvrant
l’application Maps ; conserver la carte interactive sur les grands écrans.

**Critères d’acceptation :**

- les visuels sont fournis ou validés par Arzu et disposent des consentements
  nécessaires ;
- le hero conserve un titre, un message et un CTA visibles sans défilement sur un
  téléphone courant ;
- l’aperçu de carte n’introduit pas de piège de défilement ;
- les images utilisent des dimensions, formats et textes alternatifs adaptés.

**Dépendances :** élément 23 pour les règles visuelles et élément 24 pour le budget
de performance.

---

## Réservation et espace client

### 5. Permettre les liens profonds vers une prestation — ✅ Terminé

**Priorité : P0 · Effort : S · Nature : nouvelle capacité**

**Constat et valeur.** Le tunnel démarre toujours sur la liste complète, même
lorsque la cliente vient de consulter un soin précis. Le choix réalisé sur la
vitrine ne peut pas être transmis à `/reservation`.

**Recommandation.** Accepter un slug de prestation dans l’URL, le valider contre
le catalogue réservable et initialiser le wizard sur cette prestation. Une valeur
inconnue, invisible, archivée ou non réservable retombe proprement sur la première
étape sans erreur.

**Critères d’acceptation :**

- chaque bouton de prestation produit une URL partageable et stable ;
- un rechargement conserve la prestation présélectionnée ;
- aucune donnée de prix ou de durée venant de l’URL n’est considérée comme fiable ;
- la validation serveur reste la source de vérité lors de la réservation.

**Dépendances :** aucune ; débloque l’élément 1.

### 6. Repenser le calendrier mobile de réservation — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : amélioration**

**Constat et valeur.** L’écran actuel combine un champ de date natif et une rangée
hebdomadaire horizontale dont seuls quelques jours sont visibles. Les jours
fermés et complets se ressemblent, tandis que la recherche du prochain créneau
modifie la sélection sans expliquer clairement le déplacement.

**Recommandation.** Utiliser un seul calendrier mobile : bandeau de jours compact,
libellé de période, états distincts « fermé », « complet » et « disponible », puis
grille des heures. La recherche du prochain créneau doit déplacer le bandeau,
sélectionner le créneau et annoncer le résultat. Conserver le chargement d’une
semaine entière en un seul appel.

**Critères d’acceptation :**

- les sept jours sont compréhensibles sans geste horizontal obligatoire ;
- les états sont distinguables sans dépendre uniquement de la couleur ;
- la sélection et les changements de semaine sont annoncés aux technologies
  d’assistance ;
- le nombre de requêtes reste constant par semaine et aucun cache de créneaux
  serveur n’est ajouté ;
- les chemins un jour et une plage restent couverts par les tests de cohérence du
  moteur.

**Dépendances :** élément 23 pour les composants d’état et élément 24 pour les
tests mobiles.

### 7. Afficher un récapitulatif persistant et une vraie étape de vérification — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** La prestation choisie est visible au début de l’étape des
créneaux, puis disparaît pendant le défilement des heures et des coordonnées. La
confirmation définitive suit directement le formulaire, sans écran récapitulatif
où détecter une erreur.

**Recommandation.** Ajouter un résumé compact et collant indiquant prestation,
durée, prix et créneau. Avant l’écriture en base, présenter une étape de
vérification avec des actions explicites pour modifier le soin, le créneau ou les
coordonnées.

**Critères d’acceptation :**

- le résumé ne masque ni les champs ni le clavier mobile ;
- le retour à une étape conserve toutes les saisies valides ;
- la dernière action porte un libellé sans ambiguïté sur la création du
  rendez-vous ;
- le serveur revalide encore la disponibilité et les données au moment final.

**Dépendances :** élément 6 pour le nouveau calendrier.

### 8. Améliorer la saisie et les erreurs du formulaire client — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** La validation principale intervient après envoi et renvoie
un message générique. Une faute de téléphone ou d’email peut empêcher ensuite de
retrouver le rendez-vous, ce qui est particulièrement pénalisant en l’absence
d’email ou de SMS de confirmation.

**Recommandation.** Ajouter validation au fil de la saisie, formatage visuel du
téléphone suisse ou international, attributs d’autocomplétion complets et erreurs
associées à chaque champ. La normalisation serveur existante reste inchangée et
fait autorité.

**Critères d’acceptation :**

- le type de clavier mobile correspond au champ ;
- les espaces usuels d’un numéro suisse sont acceptés et le format normalisé est
  expliqué avant confirmation ;
- le premier champ invalide reçoit le focus et son erreur est annoncée ;
- aucun message ne révèle l’existence d’une identité dans l’espace client ;
- les erreurs de conflit de créneau restent distinctes des erreurs de coordonnées.

**Dépendances :** élément 23 pour un composant de champ et d’erreur commun.

### 9. Rendre la confirmation durable sans notification externe — ✅ Terminé

**Priorité : P1 · Effort : S · Nature : amélioration**

**Constat et valeur.** La confirmation actuelle insiste justement sur l’absence
d’email et propose un fichier `.ics`, mais une cliente peut fermer l’écran sans
conserver les informations ou sans comprendre comment retrouver son rendez-vous.

**Recommandation.** Hiérarchiser l’écran autour du récapitulatif, proposer
« Ajouter au calendrier », « Copier les détails » et « Enregistrer en PDF » via
les fonctions natives du navigateur, puis expliquer en une phrase l’accès à
« Mes rendez-vous ». Ne pas introduire de référence secrète ni de stockage tiers.

**Critères d’acceptation :**

- les trois actions fonctionnent sur iOS et Android lorsqu’elles sont supportées ;
- un fallback clair existe quand le partage ou l’impression native est absent ;
- les détails copiés contiennent le soin, l’horaire, l’adresse et le téléphone de
  l’institut, sans données techniques ;
- le PDF de consentement reste mis en avant lorsqu’il est obligatoire.

**Dépendances :** élément 7 pour le composant de récapitulatif.

### 10. Enrichir « Mes rendez-vous » et faciliter une nouvelle réservation — ✅ Terminé

**Priorité : P1 · Effort : L · Nature : amélioration**

**Constat et valeur.** L’espace client ne montre que les rendez-vous confirmés à
venir. Le déplacement charge un jour à la fois et ne propose pas la recherche du
prochain créneau. Une cliente régulière ne peut ni consulter un historique utile
ni réserver à nouveau le même soin rapidement.

**Recommandation.** Ajouter un historique limité, une action « Réserver à
nouveau » et réutiliser le calendrier hebdomadaire de l’élément 6 pour les
déplacements. L’accès reste fondé sur la paire normalisée email/téléphone et une
session courte, sans compte ni mot de passe client.

**Critères d’acceptation :**

- les rendez-vous futurs et passés sont visuellement séparés ;
- un rendez-vous annulé, terminé ou absent porte un état compréhensible ;
- « Réserver à nouveau » ouvre le tunnel sur la même prestation si elle est
  encore réservable ;
- le déplacement conserve la prestation et respecte la limite de modification ;
- aucune autre cliente ne peut être retrouvée par recherche partielle.

**Dépendances :** éléments 6, 16 et 19.

---

## Dashboard admin mobile

### 11. Ajouter une navigation admin persistante — ✅ Terminé

**Priorité : P0 · Effort : M · Nature : amélioration**

**Constat et valeur.** Les écrans admin sont isolés et reviennent à l’agenda par
un lien textuel. Sur une longue page de prestations ou d’horaires, les actions
principales sortent rapidement de l’écran.

**Recommandation.** Introduire un layout admin partagé avec une barre inférieure
mobile : Agenda, Activité, Ajouter et Réglages. Les écrans plus larges utilisent
la même architecture sous forme de navigation supérieure ou latérale. Le bouton
d’installation et la déconnexion restent dans un menu secondaire.

**Critères d’acceptation :**

- l’écran actif et le nombre d’activités non lues sont identifiables ;
- « Ajouter » conserve le jour actuellement consulté quand il est connu ;
- la barre respecte la safe area et ne masque aucun bouton de formulaire ;
- le layout admin conserve son manifeste PWA distinct.

**Dépendances :** élément 23 pour la navigation et les badges partagés.

### 12. Transformer l’agenda mobile en chronologie journalière — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : amélioration**

**Constat et valeur.** L’agenda affiche les sept journées les unes sous les autres,
y compris les jours vides. Une semaine active produit un long défilement et les
espaces libres entre rendez-vous ne sont pas visibles, ce qui oblige Arzu à
calculer mentalement où placer un ajout manuel.

**Recommandation.** Afficher par défaut une journée sous forme de chronologie
verticale, avec bandeau hebdomadaire compact, rendez-vous positionnés à leur
heure, fermetures superposées et bouton d’ajout dans les espaces libres. Conserver
la grille hebdomadaire actuelle comme vue secondaire sur grand écran.

**Critères d’acceptation :**

- aujourd’hui est sélectionné par défaut avec retour rapide depuis toute période ;
- les heures libres, les préparations/rangements et les exceptions sont
  compréhensibles ;
- un appui sur un rendez-vous ouvre sa fiche et un appui sur un espace préremplit
  l’heure ;
- la vue n’ajoute pas de requête par jour et reste derrière la frontière dynamique
  existante ;
- les rendez-vous qui se chevaucheraient visuellement sont signalés sans affaiblir
  la contrainte de base de données.

**Dépendances :** éléments 11 et 23.

### 13. Accélérer la création, la duplication et les séries de rendez-vous — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** La création manuelle ouvre une page longue et commence par
un `select` contenant toutes les prestations. Arzu doit ressaisir les coordonnées
et le soin pour chaque rendez-vous régulier.

**Recommandation.** Ajouter une recherche de prestation groupée, la sélection
d’une cliente existante, la duplication d’un rendez-vous et la création d’une
série finie. Avant validation, afficher toutes les occurrences et les conflits.
La série doit être écrite atomiquement ou ne rien créer.

**Critères d’acceptation :**

- une prestation se trouve par nom ou catégorie sans parcourir toute la liste ;
- la duplication recopie le soin et les coordonnées, jamais l’identifiant ni
  l’horaire occupé ;
- chaque occurrence est revalidée avec préparation et rangement inclus ;
- un conflit indique précisément l’occurrence concernée ;
- aucune récurrence infinie ni tâche planifiée n’est introduite.

**Dépendances :** éléments 12, 19 et 23.

### 14. Ajouter une recherche et des filtres globaux — ⏳ Prêt à démarrer

**Priorité : P0 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** L’administration ne permet de retrouver un rendez-vous
qu’en naviguant jusqu’à sa semaine ou depuis une activité récente. Il n’existe pas
de recherche par cliente, téléphone, prestation, source ou état.

**Recommandation.** Créer un écran de recherche admin mobile avec saisie
temporisée et filtres combinables. Les recherches d’identité utilisent des
valeurs normalisées et des index adaptés ; les résultats restent paginés et ne
sont jamais placés dans un cache partagé.

**Critères d’acceptation :**

- la recherche accepte nom, téléphone complet ou email normalisé ;
- les filtres couvrent prestation, statut, source et période ;
- chaque résultat ouvre le rendez-vous ou la fiche cliente associée ;
- les requêtes sont bornées, paginées et testées sur un volume supérieur aux
  données actuelles ;
- aucune donnée cliente n’apparaît dans une URL publique ou des analytics.

**Dépendances :** élément 19 pour la recherche centrée sur les clientes.

### 15. Créer une fiche cliente exploitable par Arzu — ⏳ Prêt à démarrer

**Priorité : P1 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Les coordonnées sont actuellement répétées dans chaque
rendez-vous. Arzu ne dispose pas d’un endroit unique pour consulter l’historique,
appeler une cliente, voir ses habitudes ou conserver une note interne.

**Recommandation.** Ajouter une fiche cliente avec coordonnées normalisées,
historique, prochains rendez-vous, total de visites, notes internes et préférences
simples. Les actions appeler, copier le téléphone et créer un rendez-vous sont
accessibles en haut de l’écran mobile.

**Critères d’acceptation :**

- une correction de coordonnées peut être propagée explicitement sans modifier
  les snapshots historiques ;
- les notes internes ne sont jamais visibles dans l’espace client ;
- la fiche distingue rendez-vous confirmés, terminés, annulés et absences ;
- toute fusion de doublons est confirmée et journalisée ;
- la suppression ou l’anonymisation respecte l’élément 22.

**Dépendances :** éléments 19, 21 et 22.

### 16. Exploiter les statuts « terminé » et « absence » — ⏳ Prêt à démarrer

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** Les valeurs Prisma `COMPLETED` et `NO_SHOW` existent déjà,
mais aucune action admin ne les utilise. Les rendez-vous passés restent donc sans
issue métier exploitable et les indicateurs d’activité ne peuvent pas être
fiables.

**Recommandation.** Ajouter sur la fiche et l’agenda des actions rapides
« Terminé », « Absence » et « Rétablir ». Enregistrer l’auteur, le moment et
l’ancien statut dans le journal d’audit. Aucun statut ne doit modifier les
snapshots de prix, durée ou service.

**Critères d’acceptation :**

- les actions demandent confirmation lorsqu’elles changent un rendez-vous futur ;
- l’agenda distingue les états sans dépendre uniquement de la couleur ;
- un rendez-vous terminé ou absent ne peut plus être déplacé par la cliente ;
- le retour à `CONFIRMED` revalide l’absence de chevauchement si le créneau est
  encore pertinent ;
- les transitions sont couvertes par des tests de concurrence et d’autorisation.

**Dépendances :** élément 21 pour la traçabilité ; débloque les éléments 10 et 18.

### 17. Remplacer les formulaires d’horaires par un calendrier d’exceptions — ⏳ Prêt à démarrer

**Priorité : P1 · Effort : L · Nature : amélioration**

**Constat et valeur.** Les horaires hebdomadaires et exceptions sont gérés par des
formulaires séparés sur une page longue. Une fermeture couvrant une journée
entière peut apparaître comme `00:00–00:00`, et une période de vacances génère de
nombreuses lignes difficiles à vérifier.

**Recommandation.** Ajouter une vue calendrier mensuelle avec jours marqués,
édition en panneau mobile et raccourcis « journée entière », « copier les horaires »
et « vacances ». Regrouper visuellement les exceptions issues d’une même saisie,
tout en conservant les lignes journalières nécessaires au moteur actuel.

**Critères d’acceptation :**

- une journée entière affiche un libellé, pas `00:00–00:00` ;
- une période peut être contrôlée et supprimée comme un groupe ;
- les chevauchements d’ouverture et de fermeture sont signalés avant envoi ;
- chaque modification invalide les horaires publics et les créneaux suivants ;
- le calcul de disponibilité continue de charger toutes les exceptions de la
  fenêtre en une seule requête.

**Dépendances :** éléments 21 et 23.

### 18. Afficher des indicateurs internes utiles — 🔒 Bloqué par 16

**Priorité : P2 · Effort : M · Nature : nouvelle capacité**

**Constat et valeur.** Le dashboard montre l’agenda et l’activité récente, mais ne
résume pas la charge de travail, les revenus prévus ou les absences. Arzu doit
déduire ces informations rendez-vous par rendez-vous.

**Recommandation.** Ajouter des cartes compactes calculées depuis les snapshots :
rendez-vous du jour, heures réservées, chiffre prévu, taux d’occupation et
absences. Les agrégats portent sur une période bornée et sont calculés dans
l’application, sans outil analytique payant.

**Critères d’acceptation :**

- les montants utilisent les prix figés des rendez-vous, pas le catalogue actuel ;
- les rendez-vous annulés sont exclus et les absences sont identifiées séparément ;
- chaque indicateur explique son périmètre ;
- les lectures dynamiques restent sous `Suspense` et ne rendent pas la route
  entièrement dynamique ;
- aucun objectif financier ou donnée cliente n’est envoyé à Vercel Analytics.

**Dépendances :** élément 16 pour des statuts fiables.

---

## Modèle de données et exploitation

### 19. Introduire un modèle `Customer` normalisé — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Chaque rendez-vous contient aujourd’hui sa propre copie des
coordonnées et un digest d’identité. Cette architecture protège bien l’espace
client, mais empêche une fiche cliente, la déduplication, la recherche efficace
et la réutilisation contrôlée des coordonnées.

**Recommandation.** Ajouter `Customer` avec identité normalisée, digest unique,
coordonnées courantes et métadonnées de suivi. Relier progressivement les
rendez-vous, tout en conservant leurs snapshots afin que l’historique ne change
pas. La session client continue de contenir uniquement un digest, jamais de PII.

**Critères d’acceptation :**

- la migration est idempotente et produit un rapport des identités ambiguës ;
- aucune fusion n’est faite automatiquement lorsque les données normalisées ne
  correspondent pas exactement ;
- les rendez-vous admin incomplets restent valides sans fiche cliente ;
- une modification d’identité invalide les sessions concernées ;
- les index couvrent digest, email normalisé, téléphone normalisé et nom de
  recherche.

**Dépendances :** aucune. Les règles de conservation nécessaires à la migration
sont définies avec cet élément puis réutilisées par l’élément 22. Débloque les
éléments 13, 14, 15 et 21.

### 20. Rendre les règles de réservation configurables en base — ⏳ Prêt à démarrer

**Priorité : P1 · Effort : M · Nature : amélioration**

**Constat et valeur.** Le préavis, l’horizon, le délai de modification et le pas
des créneaux sont des constantes de code. Tout ajustement métier nécessite un
déploiement, alors qu’il s’agit de réglages propres à l’institut.

**Recommandation.** Ajouter un enregistrement unique `BookingSettings`, éditable
depuis l’administration, avec valeurs bornées et défauts identiques au
comportement actuel. Mettre les lectures en cache avec un tag dédié et invalider
ce tag après modification.

**Critères d’acceptation :**

- une migration initialise exactement les valeurs actuellement codées ;
- l’admin refuse toute combinaison incohérente ou dangereuse ;
- disponibilité, création, déplacement, textes légaux et interface utilisent la
  même source ;
- le changement de pas ne contourne jamais les durées, préparations ou rangements ;
- les tests couvrent les valeurs limites et les transitions heure d’été/hiver.

**Dépendances :** élément 21 pour journaliser les modifications.

### 21. Étendre le journal d’audit à toutes les mutations sensibles — ✅ Terminé

**Priorité : P1 · Effort : L · Nature : amélioration**

**Constat et valeur.** `AppointmentActivity` trace les créations, déplacements et
annulations effectués par les clientes. Les modifications admin, changements de
statut, horaires, exceptions, prestations et fusions de clientes ne laissent pas
de trace équivalente.

**Recommandation.** Créer un journal append-only séparé avec type d’acteur,
entité, action, identifiant et résumé avant/après limité aux champs utiles. Ne pas
dupliquer les fichiers, secrets, mots de passe ou contenus binaires. Fournir un
écran admin filtrable et paginé.

**Critères d’acceptation :**

- chaque Server Action sensible écrit son événement dans la même transaction que
  la mutation ;
- un échec ou rollback ne laisse aucun événement mensonger ;
- le journal est consultable par entité et type d’action ;
- les données sensibles inutiles sont exclues ou masquées ;
- le journal client existant reste lisible pendant la migration.

**Dépendances :** élément 19 pour identifier les événements liés aux clientes.

### 22. Formaliser export, anonymisation et restauration — ✅ Terminé

**Priorité : P1 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Les rendez-vous annulés sont conservés, les compteurs de
limitation sont nettoyés opportunistement et il n’existe pas d’outil admin pour
exporter ou anonymiser les données. Une restauration dépend donc de manipulations
techniques non documentées.

**Recommandation.** Ajouter des exports CSV générés à la demande, une action
d’anonymisation irréversible avec aperçu, et des scripts documentés de sauvegarde
et restauration PostgreSQL. Les exports sont diffusés directement au navigateur
et ne sont pas conservés dans Blob.

**Critères d’acceptation :**

- les exports rendez-vous, clientes et catalogue utilisent UTF-8 et des colonnes
  documentées ;
- les plages et statuts peuvent limiter le volume exporté ;
- l’anonymisation retire les PII tout en conservant les snapshots nécessaires aux
  statistiques comptables ;
- une confirmation renforcée affiche le nombre de lignes affectées ;
- une restauration est testable sur la base locale sans écraser la production ;
- aucune tâche planifiée ni offre payante n’est nécessaire.

**Dépendances :** éléments 19 et 21.

---

## Cohérence, accessibilité et fiabilité

### 23. Construire un système visuel commun public et admin — ✅ Terminé

**Priorité : P0 · Effort : L · Nature : amélioration**

**Constat et valeur.** Les écrans partagent les couleurs et la typographie, mais
répètent de nombreuses classes de champs, boutons, cartes, erreurs et
navigations. Certains boutons secondaires sont plus petits que les cibles
tactiles attendues et les états reposent parfois surtout sur la couleur.

**Recommandation.** Centraliser les primitives de formulaire, navigation, badge,
dialogue de confirmation, toast et état vide. Documenter leurs variantes public
et admin, puis auditer contraste, focus, tailles tactiles, zoom texte et
`prefers-reduced-motion`.

**Critères d’acceptation :**

- les champs exposent aide, erreur et état d’envoi de manière uniforme ;
- les actions destructives utilisent un dialogue accessible et un libellé
  explicite ;
- toutes les actions principales atteignent 44 px sur mobile ;
- le focus reste visible et l’ordre clavier suit l’ordre visuel ;
- aucune information de statut ne dépend uniquement d’une couleur ou d’une icône ;
- les animations d’apparition sont neutralisées lorsque le mouvement réduit est
  demandé.

**Dépendances :** aucune ; socle UI des autres éléments.

### 24. Ajouter une recette automatisée mobile et des budgets de qualité — 🟡 En cours

**Priorité : P0 · Effort : L · Nature : nouvelle capacité**

**Constat et valeur.** Les tests unitaires couvrent bien le moteur de disponibilité,
la concurrence, les sessions et les actions, mais il n’existe pas de test E2E des
parcours mobiles ni de garde-fou visuel. Les régressions de navigation, formulaire,
PWA ou coquille statique peuvent donc atteindre la production malgré les tests
métier.

**Recommandation.** Ajouter une suite E2E locale sur plusieurs largeurs mobiles,
des captures de référence ciblées et des budgets de performance. Vérifier la
réservation sans la confirmer en production ; les mutations complètes utilisent
uniquement la base locale isolée. Contrôler aussi les modes installé et hors
connexion sans mettre de données clientes en cache.

**Critères d’acceptation :**

- les parcours vitrine, réservation, espace client et admin sont testés sur une
  petite et une grande largeur mobile ;
- les scénarios locaux couvrent création, conflit, déplacement, annulation,
  changement de statut et exception ;
- le build échoue si une route publique glisse involontairement vers un rendu
  entièrement dynamique ;
- des budgets bornent JavaScript, images, LCP et CLS sur les pages publiques ;
- le service worker conserve une stratégie sûre : coquille et page hors connexion,
  jamais agenda ou PII ;
- les tests existants de cohérence entre disponibilité journalière et plage
  restent obligatoires.

**Dépendances :** accompagne tous les éléments ; les scénarios sont ajoutés au fur
et à mesure de leur livraison.

---

## Ordre de pilotage recommandé

Le backlog se pilote par priorité et dépendances, sans calendrier imposé :

1. établir les fondations transverses avec les éléments 23, 24 et 19 ;
2. supprimer les frictions immédiates du tunnel avec les éléments 5 à 8 ;
3. accélérer le quotidien d’Arzu avec les éléments 11 à 14 ;
4. enrichir ensuite les données et le suivi avec les éléments 15 à 22 ;
5. terminer les évolutions éditoriales et de confort P2 lorsque les contenus sont
   disponibles.

Chaque livraison doit conserver les invariants de sécurité, de cache, de fuseau
horaire et de concurrence décrits en tête de document.
