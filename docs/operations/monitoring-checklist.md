# Monitoring Checklist — DeMaxtore

**Last verified:** 2026-06-18  
**Endpoints:** `GET /api/healthz`, `GET /api/ready`

---

## Health endpoints

### Liveness — `/api/healthz`

| Field | Expected |
|-------|----------|
| HTTP status | `200` |
| `status` | `"ok"` |
| `uptimeSec` | increasing between polls |

**Does not** check DB or dependencies. Use for "process alive" only.

```bash
curl -sf http://127.0.0.1:3001/api/healthz
```

### Readiness — `/api/ready`

| Field | Expected |
|-------|----------|
| HTTP status | `200` when ready, `503` when not |
| `ready` | `true` |
| `checks.db` | `"up"` |
| `checks.storage` | `"up"` |
| `checks.email` | `"up"` or `"degraded"` (non-blocking) |
| `checks.redis` | `"up"` or `"skipped"` (memory adapter) |
| `checks.socketAdapter` | `"up"` |

```bash
curl -sf http://127.0.0.1:3001/api/ready
```

**Alert:** 2 consecutive `503` or `checks.db=down`.

---

## External uptime monitor (P0)

| Probe | Interval | Alert |
|-------|----------|-------|
| `GET /api/healthz` | 60s | 2 failures |
| `GET /api/ready` | 60s | 2 failures |

---

## Signal checklist

### 1. Uptime

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| API reachable | Uptime monitor | Down > 2 min | Page ops; check PM2 |
| `uptimeSec` reset | healthz JSON | Sudden drop | PM2 restart occurred — check logs |

### 2. Backend errors

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| Pino `level>=50` | `/var/log/demaxtore/backend-error.log` | Spike vs baseline | Triage stack trace |
| HTTP 5xx | Nginx/access log | > 1% over 5 min | Check ready + DB |
| Unhandled rejections | PM2 error log | Any recurring | Fix or hotfix |

### 3. Payment failures

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| `INVALID_WEBHOOK_SIGNATURE` | Backend logs | Any in prod | Verify provider secret rotation |
| Webhook 5xx | Payment provider dashboard | Any | See incident runbook |
| `PAYMENT_DISPUTED` hold | Control Tower / order state | New disputes | Ops review order |
| Duplicate webhook replay | `duplicate:true` responses | Expected (normal) | No action |

Query pattern (logs):

```
payment.succeeded | payment.disputed | INVALID_WEBHOOK_SIGNATURE
```

### 4. Carrier failures

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| `INVALID_WEBHOOK_SIGNATURE` (carrier) | Backend logs | Any in prod | Verify `CARRIER_WEBHOOK_SECRET` |
| `carrier_event_records` stuck | DB / admin | Events not applied | Reconcile carrier feed |
| Shipment desync | Control Tower alerts | New `ORDER_*` / `SHIPMENT_*` desync | Run FSM audit script |

### 5. DB connection failures

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| `/api/ready` → `db: down` | Readiness probe | Immediate | Check PostgreSQL service |
| Prisma connection errors | Backend logs | Any sustained | Restart backend after DB fix |
| Connection pool exhaustion | Logs / pg stat | Rising latency | Scale connection limits |

### 6. PM2 restart count

| Signal | Source | Threshold | Action |
|--------|--------|-----------|--------|
| `↺` restart count | `pm2 list` | > 3 in 24h | Investigate crash loop |
| `max_restarts` hit | `pm2 describe` | Process errored | Fix root cause before restart |
| Memory restart | PM2 logs | `max_memory_restart` | Review heap; check leak |

```bash
pm2 list
pm2 describe demaxtore-backend | grep -E "restarts|unstable"
```

### 7. Webhook failures (payment + carrier)

| Signal | Endpoint | Expected failure modes |
|--------|----------|------------------------|
| Missing signature | `POST /api/payments/webhook` | `401 INVALID_WEBHOOK_SIGNATURE` |
| Bad HMAC | same | `401` |
| Valid event | same | `200 {"received":true}` |
| Duplicate | same | `200 {"duplicate":true}` |
| Carrier | `POST /api/webhooks/carrier` | Same HMAC rules |

**Alert:** sustained `401` spike may indicate attack or misconfigured provider; sustained `5xx` is P1.

---

## In-app monitoring (no external APM required)

| Tool | Location | Use |
|------|----------|-----|
| Control Tower | Admin dashboard | Desync, doc rejection, payment holds |
| Exception Hub | Admin / role dashboards | Stuck workflows |
| System Operations | Admin | Backup overdue alerts |
| Readiness API | `/api/ready` | Automated probe |

---

## Daily ops (launch week)

| # | Task | Command |
|---|------|---------|
| 1 | Health check | `curl /api/healthz && curl /api/ready` |
| 2 | PM2 status | `pm2 list` |
| 3 | Error log scan | `pm2 logs demaxtore-backend --lines 200 \| grep level` |
| 4 | Desync audit | `npx tsx apps/backend/scripts/fsm-migration-audit.mjs` |
| 5 | Backup verify | Admin → System Operations or backup API |

---

## Weekly ops

| Task | Purpose |
|------|---------|
| Review Control Tower open alerts | Stale exceptions |
| Review webhook failure count | Provider health |
| Review PM2 restart trend | Stability |
| Document rejection rate | Compliance UX |

---

## Not in scope (post-pilot)

- Prometheus/Grafana
- Sentry APM
- PagerDuty integration

See also: `docs/ops-monitoring-minimum.md`, `docs/go-live/monitoring-deployment-plan.md`
