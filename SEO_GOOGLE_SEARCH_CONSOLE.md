# SEO & Google Search Console — Arbeauté

Ce document résume le travail SEO déjà effectué dans le code et ce qu'il reste
à faire, à toi ou à Arzu, dans Google Search Console (GSC) et ailleurs.

## Ce qui a été fait dans le code

- **URL canonique unifiée sur `www`** — Vercel redirige déjà
  `arbeaute-bulle.ch` vers `www.arbeaute-bulle.ch` (redirection 307
  configurée au niveau du domaine). Le code déclarait auparavant l'apex
  (`arbeaute-bulle.ch`, sans `www`) comme URL canonique dans les métadonnées,
  ce qui contredisait la redirection réelle — un signal confus pour Google.
  Toutes les métadonnées, le sitemap et les données structurées utilisent
  maintenant `https://www.arbeaute-bulle.ch`.
- **Titres et descriptions par page** — chaque page (accueil, réservation,
  mes rendez-vous, pages légales) a désormais son propre titre et sa propre
  description, au lieu de reprendre partout ceux de la page d'accueil.
- **Données structurées (JSON-LD)** — le site publie une fiche
  `BeautySalon` (adresse, téléphone, géolocalisation, réseaux sociaux et
  **horaires réels**, synchronisés avec ce qu'Arzu configure dans
  l'administration). C'est ce qui permet à Google d'afficher un encart
  enrichi (adresse, horaires, étoiles si des avis arrivent) directement dans
  les résultats de recherche.
- **Image de partage (Open Graph)** — générée automatiquement (aucune image
  n'existait avant), elle s'affiche quand le site est partagé sur
  WhatsApp, Facebook, Instagram ou dans un aperçu de lien.
- **`robots.txt` intelligent** — n'autorise l'indexation que sur le vrai
  déploiement de production Vercel. Les déploiements de prévisualisation
  (preview, une URL différente à chaque `git push`) ne seront jamais
  indexés par erreur.
- **`sitemap.xml`** — ne référence que les pages qui doivent apparaître dans
  Google (accueil, réservation). Les pages légales restent accessibles et
  indexables via le footer, mais n'encombrent pas le sitemap.
- **En-têtes de sécurité** (CSP, HSTS, X-Frame-Options, etc.) — alignés sur
  tes autres sites (lejardindesetoiles.ch, yoga-stephanie). Sans lien direct
  avec le classement, ils font partie des signaux de confiance que Google
  évalue de plus en plus.
- **Pages légales ajoutées** — mentions légales et conditions générales
  (annulation à 48 h ouvrables, facturation à 100 % en cas de non-annulation),
  politique de confidentialité entièrement réécrite.
- **Texte alternatif** sur les images de prestations, manquant auparavant
  (important pour Google Images et l'accessibilité).

## Ce qui a déjà été fait dans Google Search Console

- La propriété `sc-domain:arbeaute-bulle.ch` est déjà vérifiée (au niveau du
  domaine entier, donc `www` et l'apex sont automatiquement couverts, pas
  besoin d'ajouter une deuxième propriété).
- Le sitemap `https://www.arbeaute-bulle.ch/sitemap.xml` a été soumis avec
  succès (statut « Opération effectuée », 3 URLs découvertes lors du test).

## Ce qu'il reste à faire

### 1. Numéro IDE — réglé, rien à faire

Un numéro IDE/UID n'est obligatoire en Suisse que pour les entreprises
inscrites au registre du commerce (généralement au-delà de CHF 100'000 de
chiffre d'affaires annuel pour une entreprise individuelle, ou en cas
d'assujettissement TVA). Arzu n'étant pas dans ce cas, les mentions légales
indiquent simplement « entreprise individuelle, non inscrite au registre du
commerce » — pas de placeholder à compléter.

### 2. Fiche Google Business Profile — déjà en place, à fiabiliser

Bonne nouvelle : la fiche existe déjà et est active (note 4,9 sur 102 avis),
avec la bonne adresse (Place du marché 25), le bon téléphone et un lien vers
`https://www.arbeaute-bulle.ch`. Deux points à vérifier par Arzu sur
[business.google.com](https://business.google.com/) :

1. **Confirmer qu'elle a bien la main dessus** — la fiche affichait encore
   « Own this business? » lors de la vérification, ce qui peut signifier
   qu'elle n'est pas (ou plus) revendiquée par le compte actuellement
   utilisé. Si Arzu n'a pas d'accès de gestion confirmé, il faut le
   réclamer/vérifier depuis son propre compte Google.
2. **Nettoyer les anciennes adresses qui traînent sur le web** — plusieurs
   annuaires tiers (search.ch, local.ch, l'ancien site arbeaute.ch,
   Instagram) citent encore « Rue de la Condémine » ou « Rue de l'étang 8 »
   au lieu de la vraie adresse (Place du marché 25). Ces incohérences
   d'adresse (le « NAP » : Nom/Adresse/Téléphone) peuvent brouiller le
   signal de localisation de Google et nuire au classement dans le Local
   Pack. Idéalement, Arzu devrait corriger ou faire supprimer ces anciennes
   fiches quand c'est possible (beaucoup ont un lien « Suggest an edit » ou
   un accès de gestion si elle les a créées elle-même par le passé).

### 3. Demander l'indexation des pages clés

Une fois le prochain déploiement en ligne (avec les changements ci-dessus) :

1. Dans GSC, utilise la barre **« Inspecter n'importe quelle URL »** en haut.
2. Colle `https://www.arbeaute-bulle.ch/` puis clique sur
   **« Demander une indexation »**. Répète pour
   `https://www.arbeaute-bulle.ch/reservation`.
3. Cela n'est pas obligatoire (Google finit toujours par explorer le
   sitemap tout seul) mais accélère la prise en compte des changements de
   quelques jours à quelques heures.

### 4. Surveiller les rapports (dans une semaine environ)

Les rapports « Performances » et « Indexation » affichaient encore
« Traitement des données en cours » au moment de la vérification — c'est
normal pour une propriété tout juste créée, laisse-lui quelques jours.
Reviens ensuite régulièrement sur :

- **Indexation** → confirme que l'accueil et `/reservation` sont bien
  indexées, sans erreur.
- **Performances** → montre les requêtes qui amènent du trafic (« épilation
  laser bulle », etc.) et leur position moyenne. Utile pour savoir quels
  mots ajouter dans les textes du site avec le temps.
- **Expérience → Signaux Web essentiels (Core Web Vitals)** → à surveiller
  une fois assez de trafic accumulé ; le site est déjà construit pour être
  rapide (rendu serveur, images optimisées).

### 5. Tester les données structurées (optionnel, mais rassurant)

Une fois déployé, tu peux vérifier que la fiche `BeautySalon` est bien
reconnue par Google via le
[test de résultats enrichis](https://search.google.com/test/rich-results),
en collant `https://www.arbeaute-bulle.ch`.

### 6. Bing Webmaster Tools (optionnel, 5 minutes)

Bing a une part de marché faible en Suisse mais [Bing Webmaster
Tools](https://www.bing.com/webmasters) permet d'importer directement une
propriété Google Search Console déjà vérifiée en quelques clics — ça ne
coûte rien de le faire en même temps.

## Rappel : ce que je ne peux pas faire à ta place

- Modifier des paramètres nécessitant les identifiants personnels d'Arzu
  (Google Business Profile, Bing).
- Corriger les anciennes fiches d'annuaires tiers (search.ch, local.ch,
  etc.) — seule la personne qui les a créées ou une demande de correction
  manuelle peut le faire.
- Écrire de faux avis clients — les avis Google Business doivent venir de
  vraies clientes, c'est le seul levier vraiment déterminant à moyen terme.
