#!/usr/bin/env bash
# Example cron entry for automated PostgreSQL backups (adjust paths and DATABASE_URL).
#
# crontab -e:
#   0 2 * * * /var/www/demaxtore/DemaxtoreSolitions-main/scripts/backup-cron.example.sh >> /var/log/demaxtore-backup.log 2>&1
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${ROOT}/.data/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${BACKUP_ROOT}/${STAMP}"
mkdir -p "$OUT_DIR"

: "${DATABASE_URL:?Set DATABASE_URL in cron environment or source .env}"

pg_dump "$DATABASE_URL" --format=custom --no-owner --file="${OUT_DIR}/dmx.dump"

STORAGE_DIR="${STORAGE_DIR:-${ROOT}/.data/uploads}"
if [ -d "$STORAGE_DIR" ]; then
  tar -czf "${OUT_DIR}/uploads.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
fi

# Retain last 14 daily backups
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "$(date -Is) backup ok ${OUT_DIR}"
