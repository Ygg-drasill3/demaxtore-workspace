#!/usr/bin/env bash
# Operator-facing backup status (no secrets).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${ROOT}/.data/backups}"
STATE_DIR="${BACKUP_ROOT}/.state"
STALE_THRESHOLD_HOURS="${STALE_THRESHOLD_HOURS:-26}"

latest_success="${STATE_DIR}/latest-success.json"
latest_failure="${STATE_DIR}/latest-failure.json"
last_run="${STATE_DIR}/last-run.json"

echo "DeMaxtore backup status"
echo "backupRoot=${BACKUP_ROOT}"
echo

if [[ -f "$latest_success" ]]; then
  echo "=== Latest successful complete backup ==="
  cat "$latest_success"
  echo
  completed_at="$(python3 - <<'PY' "$latest_success"
import json, sys
from datetime import datetime, timezone
with open(sys.argv[1]) as f:
    data = json.load(f)
completed = data.get("completedAt")
print(completed or "")
PY
)"
  if [[ -n "$completed_at" ]]; then
    age_hours="$(python3 - <<'PY' "$completed_at" "$STALE_THRESHOLD_HOURS"
import sys
from datetime import datetime, timezone
completed = datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00"))
if completed.tzinfo is None:
    completed = completed.replace(tzinfo=timezone.utc)
age_hours = (datetime.now(timezone.utc) - completed.astimezone(timezone.utc)).total_seconds() / 3600
threshold = float(sys.argv[2])
if age_hours > threshold:
    print(f"STALE ageHours={age_hours:.2f} thresholdHours={threshold}")
else:
    print(f"FRESH ageHours={age_hours:.2f} thresholdHours={threshold}")
PY
)"
    echo "$age_hours"
  fi
else
  echo "=== Latest successful complete backup ==="
  echo "NONE"
  echo "STALE no successful backup recorded"
fi

echo
if [[ -f "$latest_failure" ]]; then
  echo "=== Latest failure ==="
  cat "$latest_failure"
else
  echo "=== Latest failure ==="
  echo "NONE"
fi

echo
if [[ -f "$last_run" ]]; then
  echo "=== Last run ==="
  cat "$last_run"
fi
