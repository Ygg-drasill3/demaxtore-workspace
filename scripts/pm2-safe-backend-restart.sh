#!/usr/bin/env bash
# Safe port 3001 cleanup — kills orphan node processes, never the live PM2 worker.
set -euo pipefail

PORT="${PORT:-3001}"
PM2_APP="${PM2_APP:-demaxtore-backend}"

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

kill_orphan_port_listeners() {
  local managed_pid="$1"
  local killed=0

  if ! command -v ss >/dev/null 2>&1; then
    echo "WARN: ss not found — skipping orphan port scan"
    return 0
  fi

  while read -r line; do
    [[ -z "$line" ]] && continue
    local pid
    pid=$(echo "$line" | grep -oP 'pid=\K[0-9]+' | head -1)
    [[ -z "$pid" ]] && continue
    if [[ -n "$managed_pid" && "$pid" == "$managed_pid" ]]; then
      continue
    fi
    if [[ ! -r "/proc/$pid/cmdline" ]]; then
      continue
    fi
    local cmd
    cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
    if ! is_backend_node_cmd "$cmd"; then
      echo "SKIP pid=$pid (not backend node): ${cmd:0:80}"
      continue
    fi
    echo "KILL orphan pid=$pid on :$PORT — ${cmd:0:100}"
    kill -TERM "$pid" 2>/dev/null || true
    killed=$((killed + 1))
  done < <(ss -tlnp "sport = :$PORT" 2>/dev/null | grep LISTEN || true)

  if [[ "$killed" -gt 0 ]]; then
    sleep 2
    while read -r line; do
      [[ -z "$line" ]] && continue
      local pid
      pid=$(echo "$line" | grep -oP 'pid=\K[0-9]+' | head -1)
      [[ -z "$pid" ]] && continue
      [[ -n "$managed_pid" && "$pid" == "$managed_pid" ]] && continue
      local cmd
      cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || echo "")
      is_backend_node_cmd "$cmd" || continue
      echo "KILL -9 stubborn pid=$pid"
      kill -9 "$pid" 2>/dev/null || true
    done < <(ss -tlnp "sport = :$PORT" 2>/dev/null | grep LISTEN || true)
  fi
}

safe_pm2_backend_restart() {
  local ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
  local managed
  managed=$(pm2_pid)

  echo "==> PM2 safe restart ($PM2_APP) managed_pid=${managed:-none}"
  kill_orphan_port_listeners "$managed"

  pm2 startOrReload "$ROOT/ecosystem.config.cjs" --only "$PM2_APP" --update-env

  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${PORT}/api/healthz" >/dev/null 2>&1; then
      echo "==> Health OK after safe restart"
      return 0
    fi
    sleep 2
  done

  echo "ERROR: Health check failed after safe PM2 restart"
  pm2 logs "$PM2_APP" --lines 30 --nostream || true
  return 1
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  safe_pm2_backend_restart "${1:-}"
fi
