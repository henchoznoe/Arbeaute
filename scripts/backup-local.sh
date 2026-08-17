#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$project_root/backups"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$backup_dir/arbeaute-$timestamp.dump"

mkdir -p "$backup_dir"
cd "$project_root"

docker compose exec -T db pg_dump \
  --username=postgres \
  --dbname=arbeaute \
  --format=custom \
  --no-owner \
  --no-acl > "$backup_path"

if [[ ! -s "$backup_path" ]]; then
  echo "La sauvegarde locale est vide." >&2
  exit 1
fi

echo "$backup_path"
