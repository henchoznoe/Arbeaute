# Contributing

## Development Setup

```bash
git clone https://github.com/henchoznoe/Arbeaute.git
cd Arbeaute
pnpm install
cp .env.example .env.local   # renseigner les secrets, voir le README
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Code Quality

Avant de soumettre une modification, lancez la validation complète :

```bash
pnpm check:com
```

Elle enchaîne Biome (lint et formatage), knip (code mort), TypeScript, les tests
Vitest et un build de production — exactement ce que fait la CI.

Deux points font échouer la CI plus souvent que les autres :

- **knip** — un export que rien n'importe est une erreur. Les fonctions utilisées
  uniquement dans leur module restent privées.
- **Cache Components** — chaque route doit produire un shell statique. Surveillez
  le tableau des routes en fin de build : une route qui bascule en `ƒ Dynamic`
  est une régression. Voir [AGENTS.md](AGENTS.md).

## Commit Messages

Format [Conventional Commits](https://www.conventionalcommits.org/) :
`feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`, `perf`.

```text
feat: ajouter le filtre par catégorie dans l'agenda admin
fix: corriger le calcul du délai d'annulation le week-end
docs: compléter les variables d'environnement du README
```

## Pull Requests

1. Créez une branche depuis `develop`
2. Faites vos modifications
3. Vérifiez que `pnpm check:com` passe
4. Ouvrez une PR ciblant `develop`
5. Le titre de la PR doit suivre le format Conventional Commits

`main` est la branche de release : semantic-release y publie la version et le
changelog automatiquement.

## Project Structure

Voir [AGENTS.md](AGENTS.md) pour l'architecture et les règles de placement des
fichiers.
