#!/usr/bin/env bash
# Phase 14 — Minimum production monitoring validation (read-only, no secrets).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE="${API_BASE:-https://workspace.demaxtore.com/api}"
OUT="${OUT:-/tmp/phase-14-monitoring-validation.json}"
# Always use production backup root unless explicitly overridden for isolated tests.
export BACKUP_ROOT="${BACKUP_ROOT:-${ROOT}/.data/backups}"

redact_json() {
  python3 - <<'PY' "$1"
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
print(json.dumps(data, indent=2))
PY
}

echo "Phase 14 monitoring validation"
echo "apiBase=${API_BASE}"
echo "timestamp=$(date -Is)"
echo

health_before="$(curl -sS "${API_BASE}/healthz")"
ready_before="$(curl -sS "${API_BASE}/ready")"

echo "=== healthz ==="
echo "$health_before" | python3 -m json.tool

echo "=== ready ==="
echo "$ready_before" | python3 -m json.tool

echo "=== systemd ==="
systemctl is-active demaxtore-workspace-backend.service || true
systemctl show demaxtore-workspace-backend.service -p Restart,RestartUSec,NRestarts,ActiveState,Result --value 2>/dev/null || true

echo "=== cron backup ==="
crontab -l 2>/dev/null | grep -F demaxtore-backup || echo "NOT FOUND"

echo "=== backup status ==="
bash "${ROOT}/scripts/backup-status.sh"

echo "=== disk ==="
df -h / | tail -1
du -sh "${ROOT}/.data/backups" "${ROOT}/apps/backend/.data/uploads" 2>/dev/null || true

echo "=== control tower smoke ==="
# Requires seeded admin credentials in env for full auth smoke; skip login if unavailable.
if [[ -n "${PHASE14_ADMIN_EMAIL:-}" && -n "${PHASE14_ADMIN_PASSWORD:-}" ]]; then
  token="$(curl -sS -X POST "${API_BASE}/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${PHASE14_ADMIN_EMAIL}\",\"password\":\"${PHASE14_ADMIN_PASSWORD}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")"
  for path in /control-tower/dashboard /control-tower/ops-dashboard; do
    code="$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${token}" "${API_BASE}${path}")"
    echo "${path} => ${code}"
  done
else
  echo "control tower auth smoke skipped (set PHASE14_ADMIN_EMAIL + PHASE14_ADMIN_PASSWORD to enable)"
fi

health_after="$(curl -sS "${API_BASE}/healthz")"
ready_after="$(curl -sS "${API_BASE}/ready")"

python3 - <<PY > "$OUT"
import json, os
out = {
  "timestamp": os.popen("date -Is").read().strip(),
  "apiBase": os.environ.get("API_BASE", "https://workspace.demaxtore.com/api"),
  "healthBefore": json.loads('''${health_before}'''),
  "readyBefore": json.loads('''${ready_before}'''),
  "healthAfter": json.loads('''${health_after}'''),
  "readyAfter": json.loads('''${ready_after}'''),
}
print(json.dumps(out, indent=2))
PY

echo
echo "Wrote ${OUT}"
