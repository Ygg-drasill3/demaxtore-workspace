#!/usr/bin/env bash
# Production readiness baseline — run with all feature flags OFF.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Contracts tests"
yarn workspace @dmx/contracts test

echo "==> Backend vitest"
yarn workspace @dmx/backend vitest run

echo "==> Backend typecheck"
yarn workspace @dmx/backend typecheck

echo "==> FSM desync audit"
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose

echo "==> Baseline complete"
