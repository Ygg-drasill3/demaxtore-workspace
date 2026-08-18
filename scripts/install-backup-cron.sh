#!/usr/bin/env bash
# Install DeMaxtore daily backup cron (idempotent marker).
# Usage: ./scripts/install-backup-cron.sh [--dry-run]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="# demaxtore-backup-cron"
LINE="0 2 * * * /bin/bash ${ROOT}/scripts/backup-production.sh >> /var/log/demaxtore-backup.log 2>&1 ${MARKER}"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Would install crontab line:"
  echo "$LINE"
  exit 0
fi

existing="$(crontab -l 2>/dev/null || true)"
if echo "$existing" | grep -qF "$MARKER"; then
  updated="$(echo "$existing" | grep -vF "$MARKER"; echo "$LINE")"
  printf '%s\n' "$updated" | crontab -
  echo "Updated backup cron (daily 02:00, bash + in-script env load)"
else
  ( printf '%s\n' "$existing"; echo "$LINE" ) | crontab -
  echo "Installed backup cron (daily 02:00, bash + in-script env load)"
fi

crontab -l | grep demaxtore
