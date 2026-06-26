#!/usr/bin/env bash
# API smoke tests — post-deploy validation
set -euo pipefail
PORT="${PORT:-3001}"
BASE="http://127.0.0.1:${PORT}/api"

echo "==> Smoke: healthz"
curl -sf "$BASE/healthz" | grep -q '"ok"' || { echo "healthz failed"; exit 1; }

echo "==> Smoke: ready"
curl -sf "$BASE/ready" >/dev/null || echo "WARN: ready endpoint not ok (may be degraded)"

echo "==> Smoke: catalog-rfq rejects unsigned"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/catalog-rfq" -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "401" ] || [ "$STATUS" = "503" ] || { echo "catalog-rfq expected 401/503 got $STATUS"; exit 1; }

echo "==> Smoke: whatsapp webhook rejects unsigned"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/webhooks/whatsapp" -H "Content-Type: application/json" -d '{}')
[ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] || { echo "whatsapp expected 401/403 got $STATUS"; exit 1; }

echo "==> Smoke tests passed"
