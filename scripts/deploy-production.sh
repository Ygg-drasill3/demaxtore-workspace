#!/usr/bin/env bash
# Production deployment — backend + frontend with health gate and rollback
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3001}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/healthz"
ROLLBACK_MARKER="$ROOT/.deploy-last-good"

rollback() {
  echo "==> ROLLBACK: restoring last known-good PM2 + frontend dist"
  if [ -f "$ROLLBACK_MARKER" ]; then
    # shellcheck disable=SC1090
    source "$ROLLBACK_MARKER"
    pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env || true
    if [ -n "${FRONTEND_BACKUP:-}" ] && [ -d "$FRONTEND_BACKUP" ]; then
      rsync -a "$FRONTEND_BACKUP/" "$ROOT/apps/frontend/dist/"
    fi
  fi
  exit 1
}
trap rollback ERR

bash "$ROOT/scripts/pre-deploy-validate.sh"

echo "==> Snapshot rollback point"
FRONTEND_BACKUP="$ROOT/apps/frontend/dist-backup-$(date +%s)"
if [ -d "$ROOT/apps/frontend/dist" ]; then
  cp -a "$ROOT/apps/frontend/dist" "$FRONTEND_BACKUP"
fi
echo "FRONTEND_BACKUP=$FRONTEND_BACKUP" > "$ROLLBACK_MARKER"

echo "==> Deploying backend"
cd "$ROOT/apps/backend"
yarn prisma:deploy
yarn build

echo "==> Deploying frontend"
bash "$ROOT/scripts/deploy-workspace-frontend.sh"

echo "==> PM2 reload"
bash "$ROOT/scripts/pm2-safe-backend-restart.sh" "$ROOT" || {
  echo "ERROR: PM2 safe restart failed"
  pm2 logs demaxtore-backend --lines 30 --nostream
  rollback
}

echo "==> Nginx validation"
if command -v nginx >/dev/null 2>&1; then
  nginx -t || rollback
  systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
fi

echo "==> Waiting for health"
for i in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" >/dev/null; then
    echo "Health OK"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Health check failed"
    pm2 logs demaxtore-backend --lines 30 --nostream
    rollback
  fi
done

bash "$ROOT/scripts/smoke-test.sh"
echo "==> Deploy complete (backend + frontend)"
