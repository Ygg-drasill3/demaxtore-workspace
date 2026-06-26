#!/usr/bin/env bash
# Install DeMaxtore daily backup cron (idempotent marker).
# Usage: ./scripts/install-backup-cron.sh [--dry-run]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# demaxtore-backup-cron"
LINE="0 2 * * * cd ${ROOT} && set -a && source apps/backend/.env && set +a && ${ROOT}/scripts/backup-cron.example.sh >> /var/log/demaxtore-backup.log 2>&1 ${MARKER}"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Would append to crontab:"
  echo "$LINE"
  exit 0
fi

if crontab -l 2>/dev/null | grep -qF "$MARKER"; then
  echo "Backup cron already installed"
  exit 0
fi

( crontab -l 2>/dev/null || true; echo "$LINE" ) | crontab -
echo "Installed backup cron (daily 02:00)"
crontab -l | grep demaxtore
