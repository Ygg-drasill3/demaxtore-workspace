# Monitoring Coverage Report

**Date:** 2026-06-17  
**Reference:** [`docs/ops-monitoring-minimum.md`](../ops-monitoring-minimum.md)

---

## Verdict: **PARTIAL — in-app OK, external gaps**

---

## Signal coverage

| Signal | Mevcut | Eksik | Severity |
|--------|--------|-------|----------|
| Backend errors | Pino → stdout | Centralized log store, alert on error spike | **High** |
| Frontend errors | Browser console only | Sentry / error tracking | **High** |
| Payment failures | Timeline + webhook logs | Dedicated dashboard, `PAYMENT_WEBHOOK_SECRET` alert | **Medium** |
| Carrier failures | `carrier_event_records` table | External alert on `applied` anomalies | **Medium** |
| Desync | CT scan (15m) + `fsm-migration-audit.mjs` | Automated daily external alert | **Medium** |
| Exception creation | Exception Hub + `trade_exceptions` | v1/v2 duplicate monitoring when P3 on | **Medium** |
| Health probes | `/api/healthz`, `/api/ready` | LB/uptime monitor configured | **Ops** |
| Backup overdue | `system-alerts.ts` in-app | Cron not scheduled (see P0 report) | **High** |
| 5xx rate | Nginx access log (if deployed) | No Prometheus/Grafana | **Medium** |

---

## Staging validation (live)

```bash
curl http://127.0.0.1:3001/api/healthz  # {"status":"ok"}
curl http://127.0.0.1:3001/api/ready   # db: up, storage: up
```

**Health endpoints:** **PASS** on running backend.

---

## Minimum viable launch monitoring

1. Uptime monitor on `/api/healthz` + `/api/ready` (60s interval)
2. Ship Pino logs to centralized store (journald → Loki/CloudWatch)
3. Daily manual: `fsm-migration-audit.mjs --verbose` + error log review
4. Backup cron + admin backup API record

---

## Not in scope (post-pilot)

- Prometheus/Grafana
- Sentry APM
- On-call paging integration
