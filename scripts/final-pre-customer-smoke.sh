#!/usr/bin/env bash
# Turkey MVP — Final Pre-Customer Smoke (read-only where possible).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_BASE:-https://workspace.demaxtore.com/api}"
UI="${UI_BASE:-https://workspace.demaxtore.com}"
OUT="${OUT:-/tmp/final-pre-customer-smoke.json}"
PW="${E2E_PASSWORD:-Passw0rd!}"

R4_PO="32ce9003-af7e-438e-aa21-0848c8e338c1"
R4_SHIP="9f1c326a-97ad-4937-a200-09e628251070"
R4_CUSTOMS="8a96c974-700e-40ba-9db0-0b331f7d4583"
R4_INLAND="5110057f-904d-4219-95e3-689aa6cf701c"
R4_LC="54bd93ab-cdd8-4da7-8dc5-8bea6c08a93c"
R4_PRODUCT="b5748ad0-ba1d-4c7f-9402-3352c41ba606"

login() {
  curl -sS -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PW\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])"
}

api_get() {
  local token="$1" path="$2"
  curl -sS -o /tmp/smoke-body.json -w "%{http_code}" \
    -H "Authorization: Bearer $token" "$API$path"
}

echo "=== Production health ==="
curl -fsS "$API/healthz" | python3 -m json.tool
curl -fsS "$API/ready" | python3 -m json.tool

echo "=== Backup ==="
bash "$ROOT/scripts/backup-status.sh"

echo "=== Disk ==="
df -h / | tail -1

echo "=== Role logins ==="
declare -A TOKENS
for pair in \
  "buyer:buyer1@acme.test" \
  "admin:admin@demaxtore.local" \
  "supplier:supplier1@acme-mfg.test" \
  "broker:broker.smoke@demaxtore.local" \
  "trucker:trucker.smoke@demaxtore.local" \
  "origin:origin.agent.smoke@demaxtore.local"; do
  role="${pair%%:*}"
  email="${pair##*:}"
  code=$(curl -sS -o /tmp/login.json -w "%{http_code}" -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"password\":\"$PW\"}")
  if [[ "$code" == "200" ]]; then
    TOKENS[$role]=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['accessToken'])")
    echo "$role login: PASS ($code)"
  else
    echo "$role login: FAIL ($code)"
    exit 1
  fi
done

BUYER="${TOKENS[buyer]}"
BUYER2=$(login "buyer2@beta.test")
ADMIN="${TOKENS[admin]}"
BROKER="${TOKENS[broker]}"
TRUCKER="${TOKENS[trucker]}"

echo "=== R4 buyer state ==="
check_r4() {
  local label="$1" path="$2"
  st=$(api_get "$BUYER" "$path")
  echo "$label: HTTP $st"
  [[ "$st" == "200" ]] || { echo "R4 check failed: $label"; exit 1; }
}
check_r4 product "/products/$R4_PRODUCT"
check_r4 po "/purchase-orders/$R4_PO"
check_r4 shipment "/shipments/$R4_SHIP"
check_r4 customs "/customs/cases/$R4_CUSTOMS"
check_r4 inland "/inland/$R4_INLAND"
check_r4 landed-cost "/landed-cost/$R4_LC"

python3 <<PY
import json
with open('/tmp/smoke-body.json') as f: d=json.load(f)
print('customs status', d.get('status'), 'readiness', d.get('readinessStatus'))
PY
api_get "$BUYER" "/customs/cases/$R4_CUSTOMS" >/dev/null

python3 <<PY
import json
with open('/tmp/smoke-body.json') as f: d=json.load(f)
print('inland status', d.get('status'))
PY
api_get "$BUYER" "/inland/$R4_INLAND" >/dev/null

echo "=== Unknown != zero (landed cost) ==="
api_get "$BUYER" "/landed-cost/$R4_LC" >/dev/null
python3 <<'PY'
import json
with open('/tmp/smoke-body.json') as f: d=json.load(f)
for k in ['insuranceCost','dutyTaxCost','inlandCost']:
    v=d.get(k)
    print(f'  {k}={v!r}')
    if v == 0:
        raise SystemExit('FAIL: null component became zero')
print('Unknown!=Zero: PASS')
PY

echo "=== Tenant isolation (buyer2 vs R4) ==="
for path in "/purchase-orders/$R4_PO" "/shipments/$R4_SHIP" "/customs/cases/$R4_CUSTOMS"; do
  st=$(api_get "$BUYER2" "$path")
  echo "buyer2 $path => $st (expect 403/404)"
  if [[ "$st" == "200" ]]; then echo "TENANT LEAK"; exit 1; fi
done

echo "=== Margin spot check ==="
python3 <<PY
import json, re
with open('/tmp/smoke-body.json') as f: raw=f.read()
if re.search(r'buyRate|internalMargin|marginUsd', raw, re.I):
    raise SystemExit('margin field in buyer payload')
print('No margin fields in spot payload: PASS')
PY

echo "=== Control Tower ==="
st=$(api_get "$ADMIN" "/control-tower/ops-dashboard")
echo "ops-dashboard: $st"

echo "=== Smoke complete ==="
