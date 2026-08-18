# BulkContainer — Control Tower Impact

**Sprint:** 13A — BulkContainer Architecture & Product Design  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Constraint:** Additive alerts only — no changes to existing Control Tower core or SmartContainer/RFQ/CB/Order/Shipment alert rules.

---

## 1. Summary

BulkContainer introduces a new **`BULK_CONTAINER`** workspace category in Control Tower. Alerts follow the established Sprint 4A pattern (same as SmartContainer):

- New alert keys in `packages/contracts/src/control-tower.ts`
- New scan module: `bulk-container-alerts.ts`
- Registration in `alert-engine.ts` → `POST /api/control-tower/scan`
- Alerts FK to `workspaces.id` where `type = BULK_CONTAINER`
- Socket events: existing `controltower.alert.created` / `controltower.alert.resolved`
- Dedup via partial unique index on `(workspace_id, alert_key)` where `resolved_at IS NULL`
- Auto-resolve when condition no longer holds

**No modifications** to existing SmartContainer (`mixed_container_*`, `smartcontainer_*`), RFQ, CommodityBid, Order, Shipment, or FreightIQ alert scanners.

---

## 2. Alert catalog

### 2.1 Specification & pricing

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_spec_missing` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Workspace in `BC_BUILDING` AND buyer attempted pricing submit AND any active line has incomplete required spec params |
| **Title** | "BulkContainer specification incomplete" |
| **Description** | "{n} line(s) in {externalRef} missing required specification parameters." |
| **Resolution** | All lines pass spec validation OR workspace cancelled |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_pricing_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Workspace state = `BC_PRICING_REQUESTED` |
| **Title** | "BulkContainer pricing request pending" |
| **Description** | "Bulk pricing request for {externalRef} awaiting operations procurement." |
| **Resolution** | State advances to `BC_PROCUREMENT_IN_PROGRESS` or request cancelled |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_pricing_sla_breach` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | `bulk_container_quotes.status IN (PENDING, SPEC_REVIEW, SOURCING, PRICING)` AND `now() > slaDeadlineAt` AND no offer sent |
| **Title** | "BulkContainer pricing SLA breach" |
| **Description** | "Pricing for {externalRef} past SLA deadline ({slaDeadlineAt})." |
| **Resolution** | Offer sent or quote cancelled |

---

### 2.2 Offer lifecycle

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_offer_expiring` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `bulk_container_offers.status = SENT` AND `validUntil - now() <= 24h` AND `validUntil > now()` |
| **Title** | "BulkContainer offer expiring soon" |
| **Description** | "Offer for {externalRef} expires at {validUntil}. Buyer has not approved." |
| **Resolution** | Offer accepted, expired, or superseded |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_offer_expired` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Offer `SENT` AND `now() > validUntil` AND workspace still `BC_BUYER_REVIEW` |
| **Title** | "BulkContainer offer expired" |
| **Description** | "Live offer for {externalRef} expired. Buyer must re-request pricing." |
| **Resolution** | New pricing requested or workspace cancelled |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_revision_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | INFO |
| **Condition** | Workspace state = `BC_REVISION_REQUESTED` |
| **Title** | "BulkContainer revision requested" |
| **Description** | "Buyer requested revision for {externalRef}." |
| **Resolution** | New pricing cycle started or workspace cancelled |

---

### 2.3 Coordination

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_allocation_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | State IN (`BC_APPROVED`, `BC_ALLOCATION_IN_PROGRESS`) AND any line without `CONFIRMED` allocation |
| **Title** | "BulkContainer allocation pending" |
| **Description** | "{n} line(s) in {externalRef} awaiting supplier allocation." |
| **Resolution** | All allocations confirmed or declined with resolution |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_allocation_declined` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | Any `bulk_container_supplier_allocations.status = DECLINED` during active coordination |
| **Title** | "BulkContainer allocation declined" |
| **Description** | "Supplier declined allocation for line in {externalRef}. Reallocation required." |
| **Resolution** | Reallocation confirmed |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_proforma_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | State = `BC_PROFORMA_PENDING` AND any proforma `PENDING` > 48h |
| **Title** | "BulkContainer proforma pending" |
| **Description** | "{n} proforma(s) for {externalRef} not yet received." |
| **Resolution** | All proformas received or verified |

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_payment_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | State = `BC_PAYMENT_TRACKING` AND any payment `PENDING` |
| **Title** | "BulkContainer payment pending" |
| **Description** | "{n} payment(s) for {externalRef} awaiting buyer confirmation." |
| **Resolution** | All payments confirmed |

---

### 2.4 Execution

| Field | Value |
|-------|-------|
| **Alert key** | `bulk_container_execution_ready` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | INFO |
| **Condition** | State = `BC_EXECUTION_READY` (recent, within 24h) |
| **Title** | "BulkContainer execution ready" |
| **Description** | "{externalRef} ready for order spawn." |
| **Resolution** | Execution spawned or manually deferred with note |

| Field | Value |
|-------|-------|
| **Alert key** | `bulkcontainer_order_spawn_failed` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | State = `BC_EXECUTION_ACTIVE` AND confirmed allocations exist AND no `bulk_container_order_links` |
| **Title** | "BulkContainer order spawn failed" |
| **Description** | "Execution active for {externalRef} but no orders spawned." |
| **Resolution** | Orders spawned successfully |

| Field | Value |
|-------|-------|
| **Alert key** | `bulkcontainer_freight_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Spawned orders eligible for FreightIQ AND no active freight request |
| **Title** | "BulkContainer freight pending" |
| **Description** | "{n} order(s) from {externalRef} without FreightIQ request." |
| **Resolution** | FreightIQ request created |

| Field | Value |
|-------|-------|
| **Alert key** | `bulkcontainer_shipment_pending` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Spawned orders without spawned shipments past threshold |
| **Title** | "BulkContainer shipment pending" |
| **Description** | "{n} order(s) from {externalRef} without shipment." |
| **Resolution** | Shipment spawned |

| Field | Value |
|-------|-------|
| **Alert key** | `bulkcontainer_execution_complete` |
| **Category** | `BULK_CONTAINER` |
| **Severity** | INFO |
| **Condition** | State = `BC_EXECUTION_COMPLETE` (recent, within 24h) |
| **Title** | "BulkContainer execution complete" |
| **Description** | "All execution milestones complete for {externalRef}." |
| **Resolution** | Auto-resolve after 24h |

---

## 3. Scan module design

**File (future):** `apps/backend/src/modules/bulk-container/bulk-container-alerts.ts`

```typescript
// Pseudocode — design only
export async function scanBulkContainerAlerts(prisma: PrismaClient): Promise<void> {
  await scanSpecMissing(prisma);
  await scanPricingPending(prisma);
  await scanOfferExpiring(prisma);
  await scanAllocationPending(prisma);
  await scanProformaPending(prisma);
  await scanPaymentPending(prisma);
  await scanExecutionReady(prisma);
  await scanOrderSpawnFailed(prisma);
  await scanFreightPending(prisma);
  await scanShipmentPending(prisma);
}
```

**Registration in `alert-engine.ts`:**

```typescript
await scanBulkContainerAlerts(prisma);  // additive line
```

**Helper reuse:** `upsertControlTowerAlert()` from `tracking-alerts.ts` (same as SmartContainer).

---

## 4. Alert key naming convention

| Phase | Prefix | Example |
|-------|--------|---------|
| Sourcing / coordination | `bulk_container_*` | `bulk_container_pricing_pending` |
| Execution bridge | `bulkcontainer_*` | `bulkcontainer_order_spawn_failed` |

Mirrors SmartContainer pattern: `mixed_container_*` + `smartcontainer_*`.

---

## 5. Control Tower UI impact

| Surface | Change |
|---------|--------|
| Alert feed filter | Add `BULK_CONTAINER` category chip |
| Workspace link | Deep link to `/admin/bulk-container/:id` |
| Command Center KPI | Additive: "Bulk requests awaiting pricing", "Bulk offers expiring" |
| Buyer Command Center | Additive: BC status cards (no SmartContainer KPI merge) |

---

## 6. Alert summary table

| Alert key | Severity | Phase |
|-----------|----------|-------|
| `bulk_container_spec_missing` | WARNING | Build |
| `bulk_container_pricing_pending` | WARNING | Pricing |
| `bulk_container_pricing_sla_breach` | CRITICAL | Pricing |
| `bulk_container_offer_expiring` | WARNING | Offer |
| `bulk_container_offer_expired` | WARNING | Offer |
| `bulk_container_revision_pending` | INFO | Offer |
| `bulk_container_allocation_pending` | WARNING | Coordination |
| `bulk_container_allocation_declined` | CRITICAL | Coordination |
| `bulk_container_proforma_pending` | WARNING | Coordination |
| `bulk_container_payment_pending` | WARNING | Coordination |
| `bulk_container_execution_ready` | INFO | Execution |
| `bulkcontainer_order_spawn_failed` | CRITICAL | Execution |
| `bulkcontainer_freight_pending` | WARNING | Execution |
| `bulkcontainer_shipment_pending` | WARNING | Execution |
| `bulkcontainer_execution_complete` | INFO | Execution |

---

## 7. Non-disruption checklist

| Existing scanner | Modified? |
|------------------|-----------|
| `mixed-container-alerts.ts` | **No** |
| `freightiq-alerts.ts` | **No** |
| `purchase-order-alerts.ts` | **No** |
| RFQ / CB alert modules | **No** |
| `alert-engine.ts` core logic | **No** — one additive scan call only |
| Alert dedup index | **No** — reuse existing |
