#!/usr/bin/env bash

set -euo pipefail

compose_file='docker-compose.e2e.yml'
database_url='postgresql://arbeaute_e2e:arbeaute_e2e@127.0.0.1:5435/arbeaute_e2e'

cleanup() {
  docker compose -f "$compose_file" down --volumes
}

trap cleanup EXIT INT TERM
docker compose -f "$compose_file" up -d --wait

export NEXT_PUBLIC_APP_URL='http://127.0.0.1:3100'
export DATABASE_URL="$database_url"
export DATABASE_URL_UNPOOLED="$database_url"
export ADMIN_PASSWORD='e2e-admin-password'
export ADMIN_SESSION_SECRET='e2e-admin-session-secret-at-least-32-characters'
export CUSTOMER_SESSION_SECRET='e2e-customer-session-secret-at-least-32-characters'
export BLOB_STORE_ID='e2e-store'
export BLOB_WEBHOOK_PUBLIC_KEY='e2e-public-key'
export E2E_ALLOW_MUTATIONS='true'

pnpm prisma generate
pnpm prisma migrate deploy
pnpm db:seed
pnpm exec next build --webpack
node scripts/verify-build-quality.ts
pnpm exec playwright test "$@"
