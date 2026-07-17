#!/usr/bin/env bash
# Staging rollback test: unified_only → mirror → unified_only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING_PM2="${STAGING_PM2:-demaxtore-backend-unified-staging}"
STAGING_PORT="${STAGING_PORT:-3101}"
ENV_FILE="${STAGING_ENV:-$ROOT/apps/backend/.env.staging}"

echo "==> Rollback test on staging (port $STAGING_PORT)"

set_flag() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

health_ok() {
  curl -sf "http://127.0.0.1:${STAGING_PORT}/api/healthz" >/dev/null
  curl -sf "http://127.0.0.1:${STAGING_PORT}/api/ready" >/dev/null
}

# Stage 1: unified_only
set_flag UNIFIED_MESSAGING_WRITE_MODE unified_only
set_flag UNIFIED_MESSAGING_SHADOW_READ_ENABLED false
pm2 restart "$STAGING_PM2" --update-env
sleep 8
health_ok || { echo "FAIL: health after unified_only"; exit 1; }
echo "PASS: unified_only"

# Stage 2: rollback to mirror
set_flag UNIFIED_MESSAGING_WRITE_MODE unified_primary_legacy_mirror
set_flag UNIFIED_MESSAGING_SHADOW_READ_ENABLED true
pm2 restart "$STAGING_PM2" --update-env
sleep 8
health_ok || { echo "FAIL: health after rollback"; exit 1; }
echo "PASS: rollback to unified_primary_legacy_mirror"

# Stage 3: restore unified_only for staging cert
set_flag UNIFIED_MESSAGING_WRITE_MODE unified_only
set_flag UNIFIED_MESSAGING_SHADOW_READ_ENABLED false
pm2 restart "$STAGING_PM2" --update-env
sleep 8
health_ok || { echo "FAIL: health after restore"; exit 1; }
echo "PASS: rollback test complete"
