#!/usr/bin/env bash
# Rollback to previous PM2 snapshot (run after saving with pm2 save)
set -euo pipefail
pm2 resurrect 2>/dev/null || pm2 reload demaxtore-backend
sleep 3
curl -sf "http://127.0.0.1:${PORT:-3001}/api/healthz" && echo "Rollback health OK" || echo "WARNING: health check failed after rollback"
