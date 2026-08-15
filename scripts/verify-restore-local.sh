#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: pnpm db:restore:verify -- backups/arbeaute-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 1
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_path="$1"
restore_database="arbeaute_restore_verify"

if [[ ! -f "$backup_path" || ! -s "$backup_path" ]]; then
  echo "Archive de sauvegarde introuvable ou vide : $backup_path" >&2
  exit 1
fi

cd "$project_root"

cleanup() {
  docker compose exec -T db dropdb \
    --username=postgres \
    --if-exists \
    "$restore_database" >/dev/null
}
trap cleanup EXIT

# La cible est codée en dur et jetable : ce script ne lit aucune URL de
# production et ne peut pas écraser la base locale principale `arbeaute`.
cleanup
docker compose exec -T db createdb \
  --username=postgres \
  "$restore_database"
docker compose exec -T db pg_restore \
  --username=postgres \
  --dbname="$restore_database" \
  --exit-on-error \
  --no-owner \
  --no-acl < "$backup_path"

docker compose exec -T db psql \
  --username=postgres \
  --dbname="$restore_database" \
  --tuples-only \
  --command='SELECT COUNT(*) AS migrations FROM "_prisma_migrations"; SELECT COUNT(*) AS services FROM "service"; SELECT COUNT(*) AS appointments FROM "appointment";'

echo "Restauration vérifiée dans la base jetable $restore_database."
