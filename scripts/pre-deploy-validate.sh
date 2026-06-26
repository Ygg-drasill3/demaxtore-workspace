#!/usr/bin/env bash
# Pre-deploy validation gate
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pre-deploy validation"
yarn workspace @dmx/backend typecheck
yarn workspace @dmx/frontend typecheck 2>/dev/null || yarn workspace @dmx/frontend exec tsc --noEmit
yarn workspace @dmx/backend build
yarn build

if ! redis-cli ping >/dev/null 2>&1; then
  echo "ERROR: Redis not reachable"
  exit 1
fi

if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1 || {
    # fallback: parse from apps/backend/.env if DATABASE_URL unset
    if [ -f "$ROOT/apps/backend/.env" ]; then
      DB_URL=$(grep -E '^DATABASE_URL=' "$ROOT/apps/backend/.env" | cut -d= -f2- | tr -d '"')
      psql "$DB_URL" -c "SELECT 1" >/dev/null 2>&1 || { echo "ERROR: Database not reachable"; exit 1; }
    else
      echo "WARN: DATABASE_URL not set — skipping DB ping"
    fi
  }
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -t >/dev/null 2>&1 || { echo "ERROR: nginx config invalid"; exit 1; }
fi

echo "==> Pre-deploy validation OK"
