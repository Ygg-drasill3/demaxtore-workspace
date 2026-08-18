# PM2 Production Runbook — DeMaxtore Backend

**Last verified:** 2026-06-18  
**Scope:** `@dmx/backend` on port 3001  
**Config:** `ecosystem.config.cjs` (repo root)

---

## Current vs target state

| Item | Current (2026-06-18) | Target |
|------|----------------------|--------|
| Process manager | Standalone `npx tsx src/server.ts` (nohup) | PM2 `demaxtore-backend` |
| Entry script | `tsx src/server.ts` (dev) | `node dist/server.js` (compiled) |
| PM2 status | `demaxtore-backend` **stopped** (24 prior restarts) | **online**, stable |
| Frontend | Vite dev `:3010` | Nginx/static build (separate runbook) |

---

## Prerequisites

```bash
# One-time host setup
sudo mkdir -p /var/log/demaxtore
sudo chown "$(whoami):$(whoami)" /var/log/demaxtore

# PM2 log rotation (recommended)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

Ensure `apps/backend/.env` exists with production values:

- `DATABASE_URL` (no quotes)
- `PAYMENT_WEBHOOK_SECRET`
- `CARRIER_WEBHOOK_SECRET`
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `NODE_ENV=production`

---

## Build and deploy

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main

# Install deps if needed
yarn install --frozen-lockfile

# Build contracts + backend (required before PM2 start)
yarn workspace @dmx/contracts build
yarn workspace @dmx/backend build

# Stop stale standalone processes (if any)
pkill -f "tsx src/server.ts" || true
pkill -f "tsx watch src/server.ts" || true

# Start or reload via PM2
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

---

## Verify after deploy

```bash
pm2 list
pm2 describe demaxtore-backend
curl -s http://127.0.0.1:3001/api/healthz
curl -s http://127.0.0.1:3001/api/ready
pm2 logs demaxtore-backend --lines 50
```

Expected:

- `status: online`
- `healthz`: `{"status":"ok",...}`
- `ready`: `{"ready":true,"checks":{"db":"up",...}}`

---

## Restart policy (ecosystem.config.cjs)

| Setting | Value | Purpose |
|---------|-------|---------|
| `autorestart` | `true` | Crash recovery |
| `max_restarts` | `10` | Prevent restart loop |
| `min_uptime` | `10s` | Count as stable start |
| `restart_delay` | `3000ms` | Backoff between restarts |
| `max_memory_restart` | `768M` | OOM protection |
| `kill_timeout` | `8000ms` | Graceful shutdown window |

---

## Log rotation

PM2 writes to:

- `/var/log/demaxtore/backend-out.log`
- `/var/log/demaxtore/backend-error.log`

With `pm2-logrotate` installed, logs rotate at 50 MB, retain 14 files, compressed.

Manual tail:

```bash
pm2 logs demaxtore-backend --lines 100
tail -f /var/log/demaxtore/backend-error.log
```

---

## Startup persistence (boot survival)

```bash
# Generate startup script (run once per host)
pm2 startup

# Execute the command printed by pm2 startup (sudo env PATH=... pm2 startup systemd -u ...)

# Save current process list
pm2 save
```

After reboot:

```bash
pm2 list   # demaxtore-backend should be online
curl -s http://127.0.0.1:3001/api/healthz
```

---

## Safe reload (zero-downtime attempt)

Single-instance fork mode — reload replaces process:

```bash
yarn workspace @dmx/backend build
pm2 reload demaxtore-backend --update-env
```

Do **not** scale `PM2_INSTANCES` above 1 unless `SOCKET_ADAPTER=redis` and `REDIS_URL` are set (see ecosystem header comment).

---

## Rollback

```bash
git checkout <previous-tag-or-commit>
yarn install
yarn workspace @dmx/contracts build
yarn workspace @dmx/backend build
pm2 reload demaxtore-backend --update-env
curl -s http://127.0.0.1:3001/api/ready
```

---

## Troubleshooting

| Symptom | Check | Action |
|---------|-------|--------|
| PM2 online but 502 | `curl :3001/api/healthz` | Check `pm2 logs`, `.env`, DB |
| Restart loop (↺ high) | `pm2 describe demaxtore-backend` | Fix crash cause; check `dist/server.js` exists |
| `dist/server.js` missing | `ls apps/backend/dist/` | Run `yarn workspace @dmx/backend build` |
| Rate limit 429 during E2E | In-memory limiter saturated | `pm2 restart demaxtore-backend` |
| Port 3001 in use | `lsof -i :3001` | Kill stale process, then `pm2 start` |

---

## Do not touch (other PM2 apps on host)

- `freightiq` (port 3000) — separate product
- `freightiq-api` (port 8000)
- `demaxtore-crm` (port 8002)

Only manage `demaxtore-backend` for DeMaxtore Solutions monorepo.
