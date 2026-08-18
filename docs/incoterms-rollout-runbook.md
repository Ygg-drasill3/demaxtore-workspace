# Incoterms Preconditions Rollout Runbook

**Owner:** Trade Ops / Platform  
**Flag:** `INCOTERMS_PRECONDITIONS_ENABLED=true`

---

## Prerequisites

- Order `incoterms` field populated or FOB default acceptable
- Backfill dry-run reviewed:

```bash
npx tsx apps/backend/scripts/incoterm-backfill-dry-run.mjs
```

- `incoterms` contracts tests green

---

## Enablement

```bash
INCOTERMS_PRECONDITIONS_ENABLED=true
# restart backend
```

---

## Behaviour

- Null incoterm → **FOB** profile at runtime (`resolveIncotermProfile`)
- Gated order actions: `book_shipment`, `mark_delivered`, `start_production`
- Missing approved documents → `409 INCOTERM_DOCUMENTS_REQUIRED`

### Risk transfer reference

| Incoterm | Risk transfer shipment state |
|----------|------------------------------|
| EXW | READY_FOR_PICKUP |
| FOB | LOADED_ON_VESSEL |
| CIF | LOADED_ON_VESSEL (+ insurance cert required) |
| DDP | DELIVERED |

---

## Validation

```bash
yarn workspace @dmx/contracts test incoterms
yarn workspace @dmx/backend vitest run incoterms-gate
yarn workspace @dmx/e2e test tests/26-trade-workspace.spec.ts
```

UI: `IncotermResponsibilityMap` on trade workspace.

---

## Rollback

```bash
INCOTERMS_PRECONDITIONS_ENABLED=false
```

---

## Optional backfill

For reporting consistency (not required for FOB default):

```sql
UPDATE order_workspaces SET incoterms = 'FOB' WHERE incoterms IS NULL;
```

Run only after ops approval; use dry-run export first.
