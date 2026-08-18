# Incident Response Runbook — DeMaxtore

**Last verified:** 2026-06-18  
**Severity:** P0 = customer blocked / data risk; P1 = degraded; P2 = workaround exists

---

## General response flow

1. **Detect** — monitor alert, customer report, or Control Tower
2. **Triage** — healthz/ready, PM2 status, recent deploys
3. **Mitigate** — restore service or apply workaround
4. **Communicate** — notify affected customers if P0 > 15 min
5. **Post-incident** — log timeline, root cause, preventive action

```bash
# First 60 seconds
curl -s http://127.0.0.1:3001/api/healthz
curl -s http://127.0.0.1:3001/api/ready
pm2 list
pm2 logs demaxtore-backend --lines 100
```

---

## 1. Payment webhook failure

### Symptoms

- Payment provider reports delivery failures
- Orders stuck awaiting payment confirmation
- Logs: `INVALID_WEBHOOK_SIGNATURE`, 5xx on `POST /api/payments/webhook`

### Diagnosis

```bash
# Test HMAC locally (replace secret from .env)
PAYLOAD='{"type":"payment.succeeded","eventId":"diag-'"$(date +%s)"'","amount":100}'
SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" | awk '{print "sha256="$2}')
curl -sv -X POST http://127.0.0.1:3001/api/payments/webhook \
  -H 'Content-Type: application/json' \
  -H "x-demaxtore-signature: $SIG" \
  -d "$PAYLOAD"
```

| Response | Meaning |
|----------|---------|
| `401 INVALID_WEBHOOK_SIGNATURE` | Secret mismatch or missing header |
| `200 {"received":true}` | Path OK — check orderId in payload |
| `500` | App error — check PM2 logs |

### Actions

| Cause | Fix |
|-------|-----|
| Wrong `PAYMENT_WEBHOOK_SECRET` | Align backend `.env` with provider; `pm2 reload demaxtore-backend` |
| Provider sending wrong header | Confirm header name `x-demaxtore-signature` |
| Invalid payload / missing order | Fix provider config; manual milestone update via admin if urgent |
| Backend down | Restore PM2; replay events from provider dashboard |

### Replay

Most providers support manual replay. Duplicate events return `{"duplicate":true}` — safe to replay.

**Severity:** P1 (payment not confirmed) → P0 if funds received but order blocked.

---

## 2. Carrier webhook failure

### Symptoms

- Shipment tracking not updating
- Carrier events missing in timeline
- Logs on `POST /api/webhooks/carrier`

### Diagnosis

Same HMAC pattern as payment, using `CARRIER_WEBHOOK_SECRET`.

### Actions

| Cause | Fix |
|-------|-----|
| Secret mismatch | Update `CARRIER_WEBHOOK_SECRET`, reload PM2 |
| Unknown tracking ref | Verify booking ref / container number mapping |
| Event already processed | Expected idempotency — no action |

**Workaround:** Admin manually advances shipment milestones in workspace.

**Severity:** P2 (tracking delay) unless customs/delivery deadline imminent → P1.

---

## 3. Database unavailable

### Symptoms

- `/api/ready` → `503`, `checks.db: "down"`
- Prisma errors in logs
- All authenticated routes fail

### Diagnosis

```bash
curl -s http://127.0.0.1:3001/api/ready
# PostgreSQL
pg_isready -h 127.0.0.1 -p 5432
systemctl status postgresql   # or equivalent
```

### Actions

| Step | Action |
|------|--------|
| 1 | Confirm PostgreSQL service running |
| 2 | Verify `DATABASE_URL` in `.env` (no quotes, correct credentials) |
| 3 | Check disk space / connection limits |
| 4 | After DB recovery: `pm2 restart demaxtore-backend` |
| 5 | Verify `/api/ready` → `db: up` |

**Severity:** P0 — full outage.

**Do not:** Run destructive migrations during incident without backup.

---

## 4. Shipment stuck

### Symptoms

- Shipment workspace shows no available actions
- State does not match physical reality (e.g. still SHIPMENT_CREATED but vessel departed)
- Control Tower desync alert

### Diagnosis

1. Open shipment workspace → note `state`
2. Control Tower → filter shipment/order alerts
3. Run desync audit:

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
```

### Actions

| Scenario | Action |
|----------|--------|
| Missing prerequisite (e.g. freight not selected) | Complete upstream order action first |
| Valid next action hidden in drawer | Use "More actions" or admin account |
| FSM desync (order vs shipment) | Admin `resolve_exception` with valid resume state — **never** arbitrary state |
| Document compliance blocking completion | Upload/approve required docs or admin override |

**Severity:** P1 if delivery blocked; P2 if tracking only.

---

## 5. Order stuck

### Symptoms

- Order cannot advance (production, freight, close)
- `PAYMENT_DISPUTED` hold active
- Exception Hub shows open exception

### Diagnosis

- Check order state + available actions
- Check payment milestones / dispute flags
- Check spawned shipments: `GET /api/orders/:id/spawned-shipments`

### Actions

| Scenario | Action |
|----------|--------|
| Payment dispute hold | Resolve dispute with provider; webhook `payment.disputed` resolution path |
| Inspection pending | Admin complete inspection or buyer skip (if policy allows) |
| Freight not requested | Buyer `request_freight` or `proceed_to_freight` |
| Cannot close order | Confirm delivery + settlement; check open exceptions |
| Malicious state bypass attempt | System ignores invalid `resumeState` — use valid FSM actions only |

**Severity:** P1.

---

## 6. Payment dispute

### Symptoms

- Webhook `payment.disputed` received
- Order on hold; actions blocked
- Timeline shows DISPUTED

### Actions

| Step | Action |
|------|--------|
| 1 | Confirm dispute with payment provider |
| 2 | Notify buyer + finance |
| 3 | Do **not** force-close order while dispute open |
| 4 | After provider resolution, send appropriate webhook or admin exception flow |
| 5 | Verify hold released and actions restored |

**Severity:** P1 (financial/compliance).

---

## 7. Document rejection

### Symptoms

- Trade doc status → REJECTED
- Control Tower alert `trade_doc_rejected`
- Shipment completion blocked (compliance NOT_READY)

### Actions

| Step | Action |
|------|--------|
| 1 | Review rejection reason in document workspace |
| 2 | Supplier re-uploads corrected document |
| 3 | Admin re-reviews → approve |
| 4 | Confirm compliance → READY |
| 5 | Retry shipment completion / order close |

**Severity:** P2 unless delivery deadline → P1.

---

## Escalation matrix

| Condition | Escalate to |
|-----------|-------------|
| DB down > 5 min | DBA + ops lead |
| Payment webhook down > 30 min with funds at risk | Finance + ops |
| Data breach / cross-tenant access | Security immediately |
| PM2 crash loop | Engineering on-call |

---

## Post-incident template

```
Incident ID:
Start / End:
Impact:
Root cause:
Timeline:
Fix applied:
Preventive action:
Customer comms: Y/N
```
