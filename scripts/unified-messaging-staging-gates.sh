#!/usr/bin/env bash
# Isolated Unified Messaging staging on port 3101 (does not modify production PM2 on 3001).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING_PORT="${STAGING_PORT:-3101}"
STAGING_PM2="${STAGING_PM2:-demaxtore-backend-unified-staging}"
STAGING_DB="${STAGING_DB:-demaxtore_unified_staging}"
BACKEND="$ROOT/apps/backend"

# Preserve credentials from backend .env; only swap database name.
if [[ -f "$BACKEND/.env" ]]; then
  BASE_URL="$(grep -E '^DATABASE_URL=' "$BACKEND/.env" | head -1 | cut -d= -f2- | tr -d '"')"
  export DATABASE_URL="${BASE_URL%/*}/$STAGING_DB"
else
  export DATABASE_URL="postgresql://demaxtore_user@127.0.0.1:5432/${STAGING_DB}"
fi
echo "==> Staging DB: $STAGING_DB on port $STAGING_PORT"
export PORT="$STAGING_PORT"
export UNIFIED_MESSAGING_ENABLED=true
export UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=true
export UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true
export UNIFIED_MESSAGING_READ_MODE="${STAGING_READ_MODE:-shadow}"
export UNIFIED_MESSAGING_WRITE_MODE="${STAGING_WRITE_MODE:-legacy_primary_unified_mirror}"

cd "$BACKEND"
if [[ "${SKIP_MIGRATE:-}" != "1" ]]; then
  yarn prisma migrate deploy || {
    echo "WARN: migrate deploy failed — continuing if schema already present (cloned staging DB)"
  }
fi
yarn build

pm2 delete "$STAGING_PM2" 2>/dev/null || true
pm2 start dist/server.js --name "$STAGING_PM2" --cwd "$BACKEND" --update-env

HEALTH="http://127.0.0.1:${STAGING_PORT}/api/healthz"
READY="http://127.0.0.1:${STAGING_PORT}/api/ready"
for i in $(seq 1 30); do
  if curl -sf "$HEALTH" >/dev/null && curl -sf "$READY" >/dev/null; then
    echo "==> Staging health OK"
    break
  fi
  sleep 2
done

curl -sf "$HEALTH" && curl -sf "$READY"
npx tsx scripts/messaging-shadow-compare.ts --all --limit=10
echo "==> Staging gate complete on :$STAGING_PORT"
