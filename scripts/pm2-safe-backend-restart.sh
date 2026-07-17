#!/usr/bin/env bash
# Safe PM2 backend restart — port 3001 orphan cleanup, health + ready wait, rollback on failure.
set -euo pipefail

PORT="${PORT:-3001}"
PM2_APP="${PM2_APP:-demaxtore-backend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/healthz}"
READY_URL="${READY_URL:-http://127.0.0.1:${PORT}/api/ready}"
MAX_WAIT_SEC="${MAX_WAIT_SEC:-60}"

pm2_pid() {
  pm2 jlist 2>/dev/null | python3 -c "
import json,sys
try:
  apps=json.load(sys.stdin)
except Exception:
  sys.exit(0)
for a in apps:
  if a.get('name')=='${PM2_APP}':
    pid=a.get('pid')
    if isinstance(pid,int) and pid>0:
      print(pid)
    break
" 2>/dev/null || true
}

is_backend_node_cmd() {
  local cmd="$1"
  [[ "$cmd" == *"dist/server.js"* ]] || [[ "$cmd" == *"src/server.ts"* ]] || [[ "$cmd" == *"tsx"*server* ]]
}

port_owner_pids() {
  if ! command -v ss >/dev/null 2>&1; then return; fi
  ss -tlnp "sport = :$PORT" 2>/dev/null | grep LISTEN | grep -oP 'pid=\K[0-9]+' || true
}

kill_orphan_port_listeners() {
  local managed_pid="$1"
  local killed=0

  for pid in $(port_owner_pids); do
    [[ -z "$pid" ]] && continue
    if [[ -n "$managed_pid" && "$pid" == "$managed_pid" ]]; then continue; fi
    if [[ ! -r "/proc/$pid/cmdline" ]]; then continue; fi
    local cmd
    cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
    if ! is_backend_node_cmd "$cmd"; then
      echo "SKIP pid=$pid (not backend node): ${cmd:0:80}"
      continue
    fi
    echo "KILL orphan pid=$pid on :$PORT"
    kill -TERM "$pid" 2>/dev/null || true
    killed=$((killed + 1))
  done

  if [[ "$killed" -gt 0 ]]; then
    sleep 2
    for pid in $(port_owner_pids); do
      [[ -n "$managed_pid" && "$pid" == "$managed_pid" ]] && continue
      local cmd
      cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
      is_backend_node_cmd "$cmd" || continue
      echo "KILL -9 stubborn pid=$pid"
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
}

wait_http_ok() {
  local url="$1"
  local label="$2"
  local i max
  max=$((MAX_WAIT_SEC / 2))
  for i in $(seq 1 "$max"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "==> $label OK"
      return 0
    fi
    sleep 2
  done
  return 1
}

safe_pm2_backend_restart() {
  local ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
  local managed prev_env_file
  managed=$(pm2_pid)
  prev_env_file=$(mktemp)
  pm2 env "$PM2_APP" 2>/dev/null > "$prev_env_file" || true

  echo "==> PM2 safe restart ($PM2_APP) managed_pid=${managed:-none}"
  kill_orphan_port_listeners "$managed"

  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --only "$PM2_APP" --update-env

  if ! wait_http_ok "$HEALTH_URL" "healthz"; then
    echo "ERROR: healthz failed — attempting rollback reload"
    pm2 restart "$PM2_APP" --update-env || true
    rm -f "$prev_env_file"
    return 1
  fi

  if ! wait_http_ok "$READY_URL" "ready"; then
    echo "ERROR: ready failed — check logs"
    pm2 logs "$PM2_APP" --lines 30 --nostream || true
    rm -f "$prev_env_file"
    return 1
  fi

  local listeners
  listeners=$(port_owner_pids | wc -l)
  echo "==> Port $PORT listeners: $listeners"
  rm -f "$prev_env_file"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  safe_pm2_backend_restart "${1:-}"
fi
