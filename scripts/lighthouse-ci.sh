#!/usr/bin/env bash
# Lighthouse CI helper for DeMaxtore (requires: npx lighthouse, Chrome)
set -euo pipefail

FRONTEND_URL="${E2E_FRONTEND_URL:-https://workspace.demaxtore.com}"
OUT_DIR="${LIGHTHOUSE_OUT:-./reports/lighthouse}"
mkdir -p "$OUT_DIR"

run_lighthouse() {
  local name="$1"
  local path="$2"
  echo "==> Lighthouse: $name ($path)"
  npx --yes lighthouse "${FRONTEND_URL}${path}" \
    --chrome-flags="--headless --no-sandbox" \
    --output=json,html \
    --output-path="${OUT_DIR}/${name}" \
    --quiet \
    --only-categories=performance,accessibility,best-practices
}

run_lighthouse login "/login"
run_lighthouse buyer-dashboard "/buyer/dashboard"
run_lighthouse operations "/operations"

echo "Reports written to ${OUT_DIR}/"
