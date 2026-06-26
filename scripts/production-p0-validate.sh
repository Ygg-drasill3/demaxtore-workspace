#!/usr/bin/env bash
# P0 production launch validation — flags OFF, security + data gates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> P0 baseline (tests + typecheck)"
./scripts/staging-baseline.sh

echo "==> Payment milestone seed dry-run"
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs | tee /tmp/payment-milestone-dry-run.json

echo "==> FSM desync audit (documented exceptions allowed)"
AUDIT_JSON="$(mktemp)"
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose --json-out "$AUDIT_JSON"
UNDOC="$(node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('$AUDIT_JSON','utf8')); process.exit((r.undocumentedDesyncCount??r.desyncCount)>0?1:0)")" || {
  echo "FAIL: undocumented desync pairs remain (see $AUDIT_JSON)"
  exit 1
}

echo "==> Required prod secrets (presence only — values not printed)"
: "${JWT_SECRET:?JWT_SECRET required}"
: "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET required}"
: "${DATABASE_URL:?DATABASE_URL required}"

if [ "${NODE_ENV:-}" = "production" ]; then
  : "${PAYMENT_WEBHOOK_SECRET:?PAYMENT_WEBHOOK_SECRET required in production}"
  : "${CARRIER_WEBHOOK_SECRET:?CARRIER_WEBHOOK_SECRET required in production}"
fi

echo "==> Health probe (optional — set HEALTH_URL)"
if [ -n "${HEALTH_URL:-}" ]; then
  curl -fsS "${HEALTH_URL}/api/healthz" >/dev/null
  curl -fsS "${HEALTH_URL}/api/ready" >/dev/null
  echo "Health OK: ${HEALTH_URL}"
fi

echo "==> P0 validation complete"
