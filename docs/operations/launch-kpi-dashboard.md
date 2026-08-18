# Launch KPI Dashboard — First 30 Days

**Purpose:** Minimum metrics to track product health after first customer launch  
**Last verified:** 2026-06-18  
**Review cadence:** Daily (week 1), then weekly (days 8–30)

---

## Dashboard layout (recommended)

| Section | Audience | Update |
|---------|----------|--------|
| Platform health | Ops | Real-time / hourly |
| Business activity | Product + Sales | Daily |
| Risk signals | Ops + Eng | Daily |
| Quality / compliance | Ops | Weekly |

Use spreadsheet, Metabase, or admin SQL until formal BI is deployed.

---

## KPI definitions

### Platform health

| KPI | Definition | Source | Target (day 1–30) |
|-----|------------|--------|-------------------|
| API uptime | % successful `/api/healthz` polls | Uptime monitor | ≥ 99.5% |
| Readiness uptime | % successful `/api/ready` with `ready:true` | Uptime monitor | ≥ 99.5% |
| PM2 restarts (24h) | Restart count delta | `pm2 list` / describe | ≤ 1/day |
| Backend error rate | Pino level≥50 per hour | Log aggregation | Baseline + alert on 3× spike |
| Webhook failure count | 401+5xx on payment+carrier webhooks | Access/error logs | Trend only; alert on 5xx |

### Business activity

| KPI | Definition | Source | Notes |
|-----|------------|--------|-------|
| Active buyers | Distinct buyers with login or action in period | `users` + audit / sessions | Exclude demo `@*.test` in prod |
| Active suppliers | Distinct suppliers with login or quote in period | Same | |
| RFQ count | RFQs created (submitted+) | `workspaces` type RFQ | By week |
| Quotation count | Quotations submitted | quotations table | Conversion = quotes / published RFQs |
| Order count | Orders spawned (PO issued+) | orders / workspaces | |
| Shipment count | Shipments spawned | shipments | |
| Closed orders | Orders in CLOSED state | order state | North-star completion |

### Risk & exceptions

| KPI | Definition | Source | Alert threshold |
|-----|------------|--------|-----------------|
| Document rejection count | Trade docs moved to REJECTED | trade_documents + CT | > 3/day investigate |
| Dispute count | Orders with PAYMENT_DISPUTED / hold | orders + timeline | Any → finance review |
| Webhook failures | Failed payment/carrier deliveries | logs + provider dashboard | Any 5xx |
| Exception count (open) | Open exceptions in Hub | exceptions API / DB | > 10 open > 48h |
| Control Tower alerts (open) | Unresolved CT alerts | control_tower | Desync alerts = P1 |
| Desync pairs | Undocumented order/shipment mismatch | `fsm-migration-audit.mjs` | > 0 = P0 ops |

---

## Sample SQL snippets (PostgreSQL)

Adjust table names to match Prisma schema if needed.

```sql
-- RFQs created last 7 days
SELECT date_trunc('day', created_at) AS day, count(*)
FROM workspaces
WHERE type = 'RFQ' AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;

-- Orders by state
SELECT state, count(*) FROM orders GROUP BY state ORDER BY count DESC;

-- Shipments by state
SELECT state, count(*) FROM shipments GROUP BY state ORDER BY count DESC;

-- Open exceptions ( illustrative — verify table name )
SELECT count(*) FROM exceptions WHERE status = 'OPEN';
```

---

## Daily standup view (week 1)

Copy this table each morning:

| Metric | Yesterday | 7d trend | Status |
|--------|-----------|----------|--------|
| Uptime % | | | 🟢/🟡/🔴 |
| Active buyers | | | |
| Active suppliers | | | |
| New RFQs | | | |
| New orders | | | |
| Shipments in transit | | | |
| Open exceptions | | | |
| Doc rejections | | | |
| Disputes | | | |
| Webhook 5xx | | | |
| PM2 restarts | | | |

---

## Weekly review (days 8–30)

| Question | Action if "no" |
|----------|----------------|
| Any order stuck > 72h without exception? | Run incident runbook §5 |
| Any desync audit failures? | FSM audit + CT remediation |
| Quotation → PO conversion healthy? | Review onboarding / UX with CS |
| Document rejection rate declining? | Supplier training |
| Backup verified this week? | Run backup check |

---

## Demo vs production separation

In production dashboards, **exclude** seeded demo tenants:

- `@acme.test`, `@beta.test`, `@dema.test`, `@demaxtore.local`

Filter by organisation or email domain in queries.

---

## Export locations

| Artifact | Path |
|----------|------|
| Desync audit JSON | `/var/log/demaxtore-desync.json` (if cron configured) |
| PM2 logs | `/var/log/demaxtore/backend-*.log` |
| Playwright baseline | 62/62 pass (regression gate before each release) |

---

## Related docs

- `docs/operations/monitoring-checklist.md`
- `docs/go-live/shadow-soak-dashboard.md`
- `docs/operations/first-customer-playbook.md`
