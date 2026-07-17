#!/usr/bin/env bash
# Real two-process socket dedup test — ports 3115/3116 only (not production/staging).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/apps/backend"
PORT_A="${SOCKET_TEST_PORT_A:-3115}"
PORT_B="${SOCKET_TEST_PORT_B:-3116}"
PM2_A="${SOCKET_TEST_PM2_A:-demaxtore-socket-test-a}"
PM2_B="${SOCKET_TEST_PM2_B:-demaxtore-socket-test-b}"

cleanup() {
  pm2 delete "$PM2_A" 2>/dev/null || true
  pm2 delete "$PM2_B" 2>/dev/null || true
  for pid in $(ss -tlnp "sport = :$PORT_A" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true); do
    kill -TERM "$pid" 2>/dev/null || true
  done
  for pid in $(ss -tlnp "sport = :$PORT_B" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true); do
    kill -TERM "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

cd "$BACKEND"
yarn build >/dev/null

export UNIFIED_MESSAGING_ENABLED=true
export UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=true
export UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror
export UNIFIED_MESSAGING_READ_MODE=unified
export NODE_ENV=test

pm2 delete "$PM2_A" "$PM2_B" 2>/dev/null || true

PORT="$PORT_A" pm2 start dist/server.js --name "$PM2_A" --cwd "$BACKEND" --update-env
PORT="$PORT_B" pm2 start dist/server.js --name "$PM2_B" --cwd "$BACKEND" --update-env

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT_A}/api/healthz" >/dev/null &&
     curl -sf "http://127.0.0.1:${PORT_B}/api/healthz" >/dev/null; then
    break
  fi
  sleep 2
done

SOCKET_TEST_PORT_A="$PORT_A" SOCKET_TEST_PORT_B="$PORT_B" \
  yarn vitest run src/modules/unified-messaging/messaging-socket-dedup.two-process.test.ts

echo "PASS: two-process socket dedup"
