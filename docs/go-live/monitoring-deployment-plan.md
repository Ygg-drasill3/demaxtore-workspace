# Monitoring Deployment Plan

**Date:** 2026-06-17  
**Target:** P0 production launch minimum observability

---

## Gap summary (from Launch Completion)

| Signal | Current | Deployment action | Priority |
|--------|---------|-------------------|----------|
| Backend errors | Pino → stdout | Ship to Loki/CloudWatch/journald | P0 |
| Frontend errors | None | Sentry or equivalent (optional P0) | P1 |
| Webhook failures | App logs | Alert on `INVALID_WEBHOOK_SIGNATURE` spike | P0 |
| Payment failures | Timeline + logs | Dashboard query on `payment.*` timeline | P1 |
| Carrier failures | `carrier_event_records` | Alert on `status=applied` anomaly | P2 |
| Desync alerts | CT in-app | Daily cron: `fsm-migration-audit.mjs` + alert if `undocumentedDesyncCount>0` | P0 |
| Exception creation | DB + Hub | Weekly count review | P1 |
| DB connection failures | `/api/ready` | Uptime monitor on `/api/ready` | P0 |
| PM2 restarts | PM2 logs | `pm2 install pm2-logrotate`; alert on restart count | P0 |

---

## Phase 0 — Launch day (required)

### 1. Uptime monitoring

```bash
# External monitor (UptimeRobot, Pingdom, etc.)
GET https://<prod-domain>/api/healthz   # every 60s
GET https://<prod-domain>/api/ready     # every 60s
```

Alert if 2 consecutive failures.

### 2. Log shipping

```bash
# Example: PM2 logs → file → logrotate
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
```

Configure host agent to forward `/root/.pm2/logs/*.log` to centralized store.

### 3. Daily ops cron

```cron
0 6 * * * cd /var/www/demaxtore/DemaxtoreSolitions-main && npx tsx apps/backend/scripts/fsm-migration-audit.mjs --json-out /var/log/demaxtore-desync.json # demaxtore-desync-audit
```

Alert if `undocumentedDesyncCount > 0`.

### 4. Backup monitoring

- Verify `/var/log/demaxtore-backup.log` daily
- Admin API: `GET /api/system/backup-status`

---

## Phase 1 — Week 2

- Nginx access log → 5xx rate alert (&gt;1% over 5m)
- Pino JSON grep `level:50` error count
- Optional: Sentry frontend DSN in `apps/frontend`

---

## Phase 2 — Flag rollout

- Carrier `applied` event rate dashboard
- Orchestrator recommendation mismatch tracker (shadow soak metrics)
- Payment webhook duplicate rate (`processed_events`)

---

## In-app (already available)

- Control Tower (15m scan)
- System Operations dashboard
- Exception Hub
- Health routes

---

## Success criteria

| Milestone | Criteria |
|-----------|----------|
| P0 launch | healthz + ready monitored; logs retained 14d; daily desync audit |
| P1 shadow | shadow soak dashboard updated daily |
| Enterprise | Prometheus/Grafana or managed APM |

---

## Related

- [`docs/ops-monitoring-minimum.md`](../ops-monitoring-minimum.md)
