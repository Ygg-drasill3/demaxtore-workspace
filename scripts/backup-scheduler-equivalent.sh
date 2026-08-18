#!/usr/bin/env bash
# Run backup using the same invocation model as production cron (non-interactive).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="${ROOT}/scripts/backup-production.sh"
LOG="/var/log/demaxtore-backup.log"
MARKER="# demaxtore-backup-cron"

if [[ ! -x "$SCRIPT" ]]; then
  chmod +x "$SCRIPT"
fi

# Cron provides a minimal environment; simulate that while keeping bash execution.
env -i \
  HOME="${HOME:-/root}" \
  LOGNAME="${LOGNAME:-root}" \
  USER="${USER:-root}" \
  SHELL=/bin/sh \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /bin/bash "$SCRIPT" >> "$LOG" 2>&1

echo "Scheduler-equivalent run complete. See ${LOG}"
