# Desync Root Cause Report

**Generated:** 2026-06-17  
**Source:** `fsm-migration-audit.mjs` + `fsm-desync-analyze.mjs` + `fsm-desync-remediation-dry-run.mjs`

---

## Summary

| Metric | Value |
|--------|-------|
| Orders scanned | 121 |
| Desync pairs | **1** |
| Critical | 1 |
| Warning | 0 |

**Production gate:** Remediate undocumented pairs before `FSM_ORCHESTRATOR_AUTO_APPLY=true`. The single known pair below is **documented** in `docs/desync-documented-exceptions.json` and excluded from `undocumentedDesyncCount` in `fsm-migration-audit.mjs`.

---

## Desync pair #1

| Field | Value |
|-------|-------|
| **Order ID** | `06a3f2e8-dd6d-4f2a-958f-316811b519db` |
| **Order ref** | `ORD-RFQ-2026-0055-78c8680d` |
| **Order state** | `IN_TRANSIT` |
| **Shipment ID** | `aa0ed303-1f17-48f2-b855-b70ca22838e8` |
| **Shipment ref** | `SHP-ORD-RFQ-2026-0055-78c8680d` |
| **Shipment state** | `SHIPMENT_CREATED` |
| **Rule** | `ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT` |
| **Severity** | **critical** |
| **Lagging entity** | `SHIPMENT` |

### Rule explanation

Order is in `IN_TRANSIT` while shipment is still in a pre-transit state (`SHIPMENT_CREATED`). Per `evaluateOrderShipmentDesync()` in `packages/contracts/src/order-shipment-orchestration.ts`, this is a **critical** desync: the order FSM was advanced without the shipment FSM catching up.

This is **not** `ORDER_TO_SHIPMENT_MIRROR` (cancel/reject) nor `ORDER_PARTIALLY_DELIVERED_MISMATCH`.

### Root cause

**`legacy_manual_order_transition_without_shipment_mirror`**

- Order workspace was advanced (likely via manual order logistics actions or E2E/API test) to `IN_TRANSIT`.
- Shipment workspace never left `SHIPMENT_CREATED` (no booking/departure milestones recorded).
- Predates Faz 2 orchestrator auto-mirror; no orchestrator bug involved.
- **Not auto-fixable without ops action** — requires shipment-led catch-up or documented exception.

### Orchestrator involvement

- With orchestrator **disabled** (baseline): no recommendations generated for this pair until Control Tower desync scan runs.
- With orchestrator **shadow**: a catch-up plan would be recorded in `orchestrator_recommendations` but states would not change until manually applied or AUTO_APPLY enabled.
- **Not a new orchestrator bug.**

---

## Safe fix recommendation

**Preferred (shipment-led):** Advance shipment through catch-up steps, then verify order mirror when AUTO_APPLY is on.

Dry-run steps from `fsm-desync-remediation-dry-run.mjs`:

| Step | Entity | Action | Via |
|------|--------|--------|-----|
| 1 | SHIPMENT | `confirm_booking` | Shipment workspace UI / gateway |
| 2 | SHIPMENT | `assign_container` | Shipment workspace UI / gateway |
| 3 | SHIPMENT | `load_vessel` | Shipment workspace UI / gateway |
| 4 | SHIPMENT | `depart_vessel` | Shipment workspace UI / gateway |
| 5 | ORDER | `mark_departed` | Only if order still lags after shipment at `IN_TRANSIT` |

**Alternative:** Trigger Control Tower desync scan with orchestrator enabled → apply recommendation via Exception Hub (`POST /api/orchestration/recommendations/:id/apply`, ADMIN).

**Staging dry-run (no mutations):**

```bash
npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs \
  --order-id 06a3f2e8-dd6d-4f2a-958f-316811b519db
```

**Post-remediation verification:**

```bash
npx tsx apps/backend/scripts/fsm-migration-audit.mjs
# Expect desyncCount: 0
```

### Manual review required?

**Yes** for production — confirm this order is not an active live trade before applying catch-up. If test/E2E residue, cancel or complete both workspaces instead of catch-up.

---

## Cleanup script policy

- `fsm-desync-remediation-dry-run.mjs` is **read-only** (rejects `--apply`).
- No feature flag dependency.
- Destructive state changes are **ops manual** or Exception Hub apply only.

---

## Commands reference

```bash
# Audit
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose

# Deep analysis
npx tsx apps/backend/scripts/fsm-desync-analyze.mjs --order-id <uuid>

# Remediation plan (dry-run)
npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs
```
