<div align="center">

[![CI](https://github.com/henchoznoe/Arbeaute/actions/workflows/ci.yml/badge.svg)](https://github.com/henchoznoe/Arbeaute/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Biome](https://img.shields.io/badge/Biome-2.5-39B420?style=flat&logo=biome)](https://biomejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

## Arbeauté

Site vitrine et **système de réservation en ligne** de
[arbeaute-bulle.ch](https://www.arbeaute-bulle.ch), institut de soins esthétiques
d'Arzu Yurdakul à Bulle.

</div>

## Overview

Une seule application Next.js sert deux publics :

- **le site public** — présentation des prestations, horaires réels, et un tunnel
  de réservation qui confirme le rendez-vous immédiatement, sans compte à créer ;
- **la console d'administration** (`/admin`) — agenda hebdomadaire, rendez-vous
  manuels, disponibilités et catalogue des prestations.

Les créneaux proposés sont calculés à partir des disponibilités hebdomadaires,
des exceptions ponctuelles et des rendez-vous déjà pris, préparation et nettoyage
compris. Une contrainte d'exclusion en base garantit qu'aucun chevauchement ne
peut être enregistré, même en cas de réservations simultanées.

### Features

- **Réservation en quatre étapes** — prestation, créneau, coordonnées et
  vérification. Le
  calendrier charge la semaine entière d'un coup et grise les jours complets ; un
  bouton « prochain créneau disponible » balaie les trois mois à venir.
- **Espace personnel sans mot de passe** — identification par adresse e-mail
  seule, session de quinze minutes, déplacement et annulation libres jusqu'à
  48 heures ouvrables avant la séance. Le compromis de sécurité est expliqué dans
  [SECURITY.md](SECURITY.md).
- **Administration** — agenda semaine et jour, création de rendez-vous hors
  horaires publics avec confirmation explicite, exceptions d'ouverture et de
  fermeture sur plusieurs jours, catalogue complet (catégories, prix, durées,
  images, formulaires de consentement).
- **Deux applications installables (PWA)** — la clientèle installe la vitrine,
  l'institut installe la console admin ; les deux cohabitent sur le même écran
  d'accueil grâce à deux manifestes distincts.
- **Export calendrier** — fichier `.ics` téléchargeable à la confirmation et
  depuis l'espace client.
- **SEO local** — données structurées `BeautySalon` alimentées par les horaires
  réels, sitemap et image Open Graph générée à la volée.
- **Anti-abus** — vérification d'origine sur chaque mutation et limitation de
  débit en base sur la réservation, l'identification client et la connexion admin.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Lucide |
| Language | TypeScript 7 (strict mode) |
| Database | Prisma 7 + PostgreSQL 18 (Neon en production) |
| Storage | Vercel Blob (images et PDF des prestations) |
| Auth | Sessions signées HMAC (admin et client), sans dépendance externe |
| Validation | Zod (env + schémas runtime) |
| Dates | date-fns, date-fns-tz (`Europe/Zurich`) |
| Quality | Biome, knip, budgets de build, husky, lint-staged |
| Testing | Vitest (tests unitaires uniquement) |
| Release | Semantic Release, Conventional Commits |
| CI/CD | GitHub Actions |
| Analytics | Vercel Analytics |
| Hosting | Vercel |
| E-mails | Resend (offre gratuite, optionnelle) |

## Quick Start

### Prerequisites

- Node.js 24+ (voir `.node-version`)
- pnpm 11+
- Docker (base de données locale)

### Installation

```bash
git clone https://github.com/henchoznoe/Arbeaute.git
cd Arbeaute
pnpm install
cp .env.example .env.local
```

Renseignez ensuite `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` et
`CUSTOMER_SESSION_SECRET` dans `.env.local` (`openssl rand -base64 32` pour les
secrets). Toute variable manquante fait échouer le démarrage : la validation Zod
de `lib/core/env.ts` est volontairement stricte.

### Database

```bash
pnpm db:up          # PostgreSQL local sur le port 5434
pnpm db:migrate     # applique les migrations
pnpm db:seed        # catalogue et disponibilités de départ
```

### Start Development

```bash
pnpm dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000),
l'administration sur [/admin](http://localhost:3000/admin).

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production (Prisma generate + migrate deploy en production uniquement) |
| `pnpm start` | Serveur de production |
| `pnpm check` | Biome : formatage, lint et tri des imports |
| `pnpm check:all` | Biome + knip |
| `pnpm check:com` | Validation complète : Biome, knip, TypeScript, tests et build |
| `pnpm knip` | Détection de code et d'exports morts |
| `pnpm test` | Tests Vitest |
| `pnpm test:watch` | Tests en mode watch |
| `pnpm db:up` / `pnpm db:down` | Démarre / arrête PostgreSQL en local |
| `pnpm db:migrate` | Crée et applique une migration |
| `pnpm db:seed` | Alimente la base |
| `pnpm db:reset` | Réinitialise la base |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:verify-catalog` | Contrôle la cohérence du catalogue |
| `pnpm db:verify-concurrency` | Vérifie l'absence de chevauchement en réservation simultanée |
| `pnpm db:verify-rate-limit` | Vérifie la limitation de débit |
| `pnpm db:backup:local` | Crée une archive de la base PostgreSQL locale |
| `pnpm db:restore:verify -- <archive>` | Restaure une archive dans une base locale jetable |

## Architecture

Le détail est documenté dans [`AGENTS.md`](AGENTS.md). Les points structurants :

- **Cache Components** (`cacheComponents: true`) — chaque route produit un shell
  statique servi par le CDN ; seules les parties réellement dynamiques (session,
  agenda, créneaux) sont rendues à la requête. Le catalogue et les horaires sont
  mis en cache sous un tag, invalidé par `updateTag` depuis l'administration.
- **Moteur de disponibilité** — une fenêtre de données chargée en quatre requêtes,
  puis un calcul pur par jour. Afficher une semaine ou chercher le prochain
  créneau sur trois mois coûte le même nombre de requêtes qu'un seul jour.
- **Réservation concurrente** — transactions `Serializable` avec reprise, doublées
  d'une contrainte d'exclusion GIST sur l'intervalle occupé (préparation et
  nettoyage inclus) comme garde-fou final.
- **Fuseau horaire** — tout est ancré sur `Europe/Zurich`, jamais sur celui du
  visiteur ; les dates circulent sous forme de clés `YYYY-MM-DD`.

## Deployment

Déploiement sur Vercel depuis `main`. `develop` est la branche de travail.

**Une base par environnement.** La branche Neon `main` est réservée à la portée
*Production* de Vercel ; une base Neon distincte sert la portée *Preview*. Chaque
déploiement migre donc la sienne, et le build est redevenu ordinaire :
`prisma generate && prisma migrate deploy && next build`.

C'est le cloisonnement des données qui rend cette simplicité possible. Tant que
les previews partageaient `DATABASE_URL` avec la production, elles lisaient et
écrivaient les vraies données de la clientèle, et deux contournements étaient
nécessaires pour limiter la casse ; les deux ont disparu avec le partage.

**Le seed ne fait pas partie du build**, et ne doit pas y entrer : ses `upsert`
portent un `update` complet, qui réécrirait sur la production les prix et
descriptions modifiés depuis l'administration. Une base de preview neuve se
peuple à la main — voir [docs/data-operations.md](docs/data-operations.md).

La règle des migrations destructives en deux temps reste en vigueur : la
production migre toujours **avant** que le nouveau code serve le trafic.

**Variables à définir dans le projet Vercel :**

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL publique (`https://www.arbeaute-bulle.ch`) |
| `DATABASE_URL` | Connexion PostgreSQL groupée (Neon) |
| `DATABASE_URL_UNPOOLED` | Connexion directe, utilisée par les migrations |
| `ADMIN_PASSWORD` | Mot de passe de l'administration |
| `ADMIN_SESSION_SECRET` | Secret de signature des sessions admin |
| `CUSTOMER_SESSION_SECRET` | Secret de signature des sessions client |
| `BLOB_STORE_ID` | Store Vercel Blob |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Clé publique des webhooks Blob |

Injectées automatiquement par Vercel : `VERCEL_ENV`,
`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_SHA`.

Le domaine canonique est `https://www.arbeaute-bulle.ch` : l'apex redirige vers
`www`, et `robots.ts` interdit l'indexation de tout déploiement qui n'est pas en
production.

## Quality Workflow

### CI Pipeline

```text
prisma generate + tsc --noEmit (type-check)
  ↓
biome check . (lint + format)
  ↓
knip (code mort)
  ↓
vitest run (tests)
  ↓
next build + budgets de qualité (rendu, JavaScript, images)
```

`pnpm check:com` reproduit exactement cette chaîne en local : c’est la seule
porte de qualité du projet.

### Stratégie de test

**Uniquement des tests unitaires Vitest.** Le projet n’a aucun test de bout en
bout et n’en aura pas : voir la règle et sa justification dans
[AGENTS.md](AGENTS.md).

Ce qui tient lieu de garde-fou à la place :

- `vitest run` couvre le moteur de disponibilité, la concurrence, les sessions,
  les actions serveur et les fonctions de formatage ;
- `scripts/verify-build-quality.ts`, appelé par `pnpm build`, analyse la sortie
  de `next build` : il échoue si une route publique cesse d’être prérendue ou si
  un budget JavaScript ou image est dépassé ;
- `tests/quality/service-worker.test.ts` vérifie que le service worker ne met en
  cache que la coquille et la page hors ligne.

### Additional Workflows

- **pr-title.yml** — impose le format Conventional Commits sur les titres de PR
- **release.yml** — versionnage et changelog automatiques via semantic-release
- **dependabot.yml** — mises à jour de dépendances groupées

### Pre-commit Hook

Husky et lint-staged exécutent `biome check --write` sur les fichiers
`*.{ts,tsx,css}` indexés.

## License

[MIT](LICENSE)
