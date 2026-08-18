# Carrier Automation Rollout Runbook

**Owner:** Logistics / Platform  
**Flag:** `CARRIER_AUTO_TRANSITION_ENABLED=true`

---

## Prerequisites (hard)

- **P2 active:** `FSM_ORCHESTRATOR_AUTO_APPLY=true` — carrier events route through orchestrator for order mirror
- `CARRIER_WEBHOOK_SECRET` configured in production (generate: `../../scripts/generate-secret.sh`)
- `carrier-event.service` unit tests green

---

## Enablement

```bash
CARRIER_AUTO_TRANSITION_ENABLED=true
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_AUTO_APPLY=true
# restart backend
```

---

## Confidence matrix

| Confidence | Behaviour |
|------------|-----------|
| `low` | Timeline only (`carrier.event.observed`); no FSM |
| `medium` | Review queue (`carrier.event.review_required`) |
| `high` | Auto transition via orchestrator when flag on |

---

## Validation

```bash
yarn workspace @dmx/backend vitest run carrier-event
yarn workspace @dmx/e2e test tests/06-shipment-flow.spec.ts
```

Manual:
- POST carrier webhook with HMAC — high confidence advances shipment
- Low confidence — shipment state unchanged
- Manual override in shipment workspace still works

---

## Rollback

```bash
CARRIER_AUTO_TRANSITION_ENABLED=false
```

Effect: high-confidence events logged as `logged` only; manual shipment actions unchanged.

---

## Audit

Query `carrier_event_records` for `status` distribution: `timeline_only`, `review`, `applied`, `logged`.

---

## Known risks

- Wrong high-confidence event can advance FSM — monitor `applied` rows
- Never enable P6 before P2 in production
