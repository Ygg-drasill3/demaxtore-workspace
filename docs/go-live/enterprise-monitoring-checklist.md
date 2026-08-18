# Enterprise Monitoring Checklist

**Updated:** 2026-07-16 (production deployment certification)  
**Host:** `workspace.demaxtore.com` / `127.0.0.1:3001`  
**Production verification:** 2026-07-16 — healthz/ready 200; `safetyGates=up`; legacy `demaxtore` PM2 process **removed**

---

## Application health

| Check | Endpoint / command | Frequency | Owner |
|-------|-------------------|-----------|-------|
| Liveness | `GET /api/healthz` → 200 | 1 min | Ops |
| Readiness (db, redis, storage, safety gates) | `GET /api/healthz/ready` | 1 min | Ops |
| Safety gates active | `ready.safetyGates.allEnabled === true` | On deploy | Eng |
| Payment capabilities | `ready.payments.onlineCollectionEnabled` | Daily | Finance ops |

---

## Process supervision (PM2)

| Process | Expected | Alert if |
|---------|----------|----------|
| `demaxtore-backend` | online, restarts < 3 / 24h | errored, restart storm, heap > 85% |
| `demaxtore-website` | online | errored |
| Legacy `demaxtore` | **removed 2026-07-16** | any reappearance |
| Satellite APIs (FreightIQ, CommodityBid, etc.) | online | errored > 5 min |

```bash
pm2 jlist | node -e "JSON.parse(require('fs').readFileSync(0)).forEach(p=>console.log(p.name,p.pm2_env.status,p.pm2_env.restart_time))"
```

---

## Logs and errors

| Source | Path | Rotation |
|--------|------|----------|
| Backend out | `/var/log/demaxtore/backend-out.log` | pm2-logrotate |
| Backend err | `/var/log/demaxtore/backend-error.log` | pm2-logrotate |
| Request correlation | `x-request-id` header (if enabled) | — |
| Sentry | `SENTRY_DSN` optional | Dashboard review daily |

---

## Infrastructure

| Check | Method | Alert threshold |
|-------|--------|-----------------|
| Disk usage | `df -h /var` | > 85% |
| Memory | PM2 `monit.memory` | > `max_memory_restart` |
| Redis | readiness `redis: up` | down |
| PostgreSQL | readiness `db: up` | down |
| SSL expiry | external monitor | < 14 days |
| Nginx upstream | `curl -sS -o /dev/null -w '%{http_code}' https://workspace.demaxtore.com/api/healthz` | non-200 |

---

## Business-critical workers

| Worker | Signal |
|--------|--------|
| `whatsapp_bridge_retry` | Stale jobs in scheduler history |
| Control tower scan | Open CRITICAL alerts unassigned > 4h |
| Payment webhooks | Failed HMAC or 5xx in logs |
| Message processing | `WorkspaceMessage` stuck FAILED |

---

## Backup

| Item | Status (2026-07-16) |
|------|---------------------|
| Schedule | Example script at `scripts/backup-cron.example.sh` — **Configured** |
| Retention | Per script (14 days) — **Configured** |
| Pre-deploy backup | **Created** `.data/backups/20260716-091714/` (4.6 MB dump) |
| Last restore drill | 2026-06-17 **VERIFIED** (`docs/go-live/restore-drill-report.md`) — **Tested** (historical) |
| Next drill due | Before full customer onboarding |

---

## Escalation

See `docs/go-live/incident-response-runbook.md`
