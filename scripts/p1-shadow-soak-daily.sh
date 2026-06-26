#!/usr/bin/env bash
# P1 shadow soak — daily snapshot. Requires FSM_ORCHESTRATOR_ENABLED=true, SHADOW_MODE=true, AUTO_APPLY=false.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_DIR="${SHADOW_SOAK_LOG_DIR:-${ROOT}/.data/shadow-soak}"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d)"
OUT="${LOG_DIR}/${STAMP}.md"
JSON="${LOG_DIR}/${STAMP}.json"

echo "==> Shadow parity report → ${OUT}"
npx tsx apps/backend/scripts/shadow-parity-report.mjs --markdown-out "$OUT" > "$JSON"

echo "==> FSM desync audit"
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose --json-out "${LOG_DIR}/${STAMP}-desync.json"

echo "==> Rollback reminder: set FSM_ORCHESTRATOR_ENABLED=false and restart PM2"
echo "Daily soak artifact: ${OUT}"
