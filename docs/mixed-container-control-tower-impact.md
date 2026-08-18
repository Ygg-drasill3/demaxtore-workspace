# Mixed Container — Control Tower Impact

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no runtime implementation)  
**Constraint:** Additive alerts only — no changes to existing Control Tower core or RFQ/CB/Order/Shipment alert rules.

---

## 1. Summary

Mixed Container introduces a new **`MIXED_CONTAINER`** workspace category in Control Tower. Alerts follow the established Sprint 4A pattern:

- New alert keys in `packages/contracts/src/control-tower.ts`
- New scan module: `mixed-container-alerts.ts`
- Registration in `alert-engine.ts` → `POST /api/control-tower/scan`
- Alerts FK to `workspaces.id` where `type = MIXED_CONTAINER`
- Socket events: existing `controltower.alert.created/resolved`

**No modifications** to existing RFQ, CommodityBid, Order, Shipment, or FreightIQ alert scanners.

---

## 2. Alert catalog

### 2.1 Pricing Expiry

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.offer.expiring_24h` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `ContainerOffer.status = PUBLISHED` AND `validUntil - now() <= 24h` AND `validUntil > now()` |
| **Workspace FK** | MC workspace |
| **Title** | "Mixed Container offer expiring soon" |
| **Description** | "Offer for {externalRef} expires at {validUntil}. Buyer has not approved." |
| **Resolution** | Auto-resolve on accept, expiry, or superseded offer |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.offer.expired` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `ContainerOffer.status = PUBLISHED` AND `now() > validUntil` AND workspace state still `OFFER_PENDING` |
| **Title** | "Mixed Container offer expired" |
| **Description** | "Live offer for {externalRef} expired. Buyer must re-request pricing." |
| **Resolution** | Auto-resolve when new pricing requested or workspace cancelled |

---

### 2.2 Supplier Allocation Delays

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.allocation.pending_48h` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `ContainerPricingRequest.status = IN_PROGRESS` AND any `SupplierAllocation.status = PENDING` AND allocation age ≥ 48h |
| **Workspace FK** | MC workspace |
| **Title** | "Supplier allocation delayed" |
| **Description** | "{n} line(s) in {externalRef} awaiting supplier confirmation for >48h." |
| **Resolution** | All allocations CONFIRMED or DECLINED |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.allocation.declined` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | Any `SupplierAllocation.status = DECLINED` during active pricing cycle |
| **Title** | "Supplier allocation declined" |
| **Description** | "Supplier declined allocation for line {productName} in {externalRef}. Reallocation required." |
| **Resolution** | Reallocation confirmed or pricing request cancelled |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.pricing.sla_breach` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | `ContainerPricingRequest.status IN (PENDING, IN_PROGRESS)` AND `now() > slaDeadlineAt` AND no offer published |
| **Title** | "Mixed Container pricing SLA breach" |
| **Description** | "Pricing request for {externalRef} past SLA deadline ({slaDeadlineAt})." |
| **Resolution** | Offer published or request cancelled |

---

### 2.3 Sample Delays

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.sample.pending_approval_72h` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `SampleRequest.status = REQUESTED` AND age ≥ 72h |
| **Workspace FK** | MC workspace (if linked) or null with buyer org in description |
| **Title** | "Sample request awaiting approval" |
| **Description** | "Sample for {productName} requested by {buyerOrg} pending >72h." |
| **Resolution** | Status → APPROVED or REJECTED |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.sample.shipment_overdue` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | `SampleRequest.status = APPROVED` AND `sampleLeadDays` elapsed AND not SHIPPED |
| **Title** | "Sample shipment overdue" |
| **Description** | "Approved sample for {productName} not shipped within expected lead time." |
| **Resolution** | Status → SHIPPED |

---

### 2.4 Container Revision Pending

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.revision.repricing_stale` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | WARNING |
| **Condition** | Workspace state = `REPRICING_REQUESTED` AND age ≥ 48h without new offer |
| **Title** | "Container revision repricing delayed" |
| **Description** | "Revision #{n} for {externalRef} awaiting repricing >48h." |
| **Resolution** | New offer published or revision abandoned |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.revision.abandoned_with_expiring_offer` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | INFO |
| **Condition** | `ContainerRevision.status = DRAFT` AND base offer expiring within 24h |
| **Title** | "Draft revision while offer expiring" |
| **Description** | "Buyer has unsaved revision draft; base offer for {externalRef} expires soon." |
| **Resolution** | Revision submitted, abandoned, or offer expired |

---

### 2.5 Execution Delays

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.execution.spawn_pending_24h` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | `ContainerExecution.status = PENDING` OR `SPAWNING_ORDERS` AND age ≥ 24h post-approval |
| **Title** | "Container execution delayed" |
| **Description** | "Approved container {externalRef} not fully spawned to orders within 24h." |
| **Resolution** | All orders spawned or execution marked FAILED with reason |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.execution.partial_spawn` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | `ContainerExecution.ordersSpawned < orderCount` AND status = `SPAWNING_ORDERS` AND age ≥ 4h |
| **Title** | "Partial order spawn" |
| **Description** | "{ordersSpawned}/{orderCount} orders spawned for {externalRef}." |
| **Resolution** | All orders spawned or ops intervention |

| Field | Value |
|-------|-------|
| **Alert key** | `mixedcontainer.execution.allocation_unconfirmed_at_approval` |
| **Category** | `MIXED_CONTAINER` |
| **Severity** | CRITICAL |
| **Condition** | Workspace state = `APPROVED` AND any linked `SupplierAllocation.status != CONFIRMED` |
| **Title** | "Unconfirmed allocation at approval" |
| **Description** | "Container {externalRef} approved with unconfirmed supplier allocations." |
| **Resolution** | All allocations confirmed or execution rolled back |

---

## 3. Alert summary matrix

| Alert key | Severity | Phase | Owner |
|-----------|----------|-------|-------|
| `mixedcontainer.offer.expiring_24h` | WARNING | Pricing | Ops / Buyer success |
| `mixedcontainer.offer.expired` | WARNING | Pricing | Ops / Buyer success |
| `mixedcontainer.allocation.pending_48h` | WARNING | Pricing | Ops allocation |
| `mixedcontainer.allocation.declined` | CRITICAL | Pricing | Ops allocation |
| `mixedcontainer.pricing.sla_breach` | CRITICAL | Pricing | Ops allocation |
| `mixedcontainer.sample.pending_approval_72h` | WARNING | Sample | Ops |
| `mixedcontainer.sample.shipment_overdue` | WARNING | Sample | Ops |
| `mixedcontainer.revision.repricing_stale` | WARNING | Optimization | Ops allocation |
| `mixedcontainer.revision.abandoned_with_expiring_offer` | INFO | Optimization | Buyer success |
| `mixedcontainer.execution.spawn_pending_24h` | CRITICAL | Execution | Ops |
| `mixedcontainer.execution.partial_spawn` | CRITICAL | Execution | Ops |
| `mixedcontainer.execution.allocation_unconfirmed_at_approval` | CRITICAL | Execution | Ops |

**Total:** 12 new alert keys.

---

## 4. Control Tower UI impact (future)

### 4.1 Operations dashboard (`/operations`)

| Widget | Addition |
|--------|----------|
| Pipeline funnel | New segment: Mixed Container (DRAFT → PRICING → OFFER → EXECUTION) |
| Critical alerts table | MC alerts appear alongside RFQ/CB/Order/Shipment |
| Category filter | Add `MIXED_CONTAINER` to alert category filter |

### 4.2 New ops view (optional, Phase 2)

**Route:** `/operations/mixed-container`

| Panel | Content |
|-------|---------|
| Pricing queue | Requests past SLA, allocation pending |
| Allocation board | Lines × supplier status (internal) |
| Execution queue | Approved containers awaiting spawn |

This is **ops-only** — supplier names visible here.

### 4.3 SLA overview extension

| SLA metric | Target | Source |
|------------|--------|--------|
| Time to offer | ≤ 48h from pricing request | `ContainerPricingRequest` |
| Offer acceptance rate | Track % accepted within validity | `ContainerOffer` |
| Execution spawn time | ≤ 24h from approval | `ContainerExecution` |
| Sample approval time | ≤ 72h | `SampleRequest` |

---

## 5. Scan module design (future)

**File:** `apps/backend/src/modules/mixed-container/mixed-container-alerts.ts`

```typescript
// Pseudocode — design only
export async function scanMixedContainerAlerts(db: PrismaClient): Promise<void> {
  await scanOfferExpiryAlerts(db);
  await scanAllocationDelayAlerts(db);
  await scanPricingSlaAlerts(db);
  await scanSampleDelayAlerts(db);
  await scanRevisionStaleAlerts(db);
  await scanExecutionDelayAlerts(db);
}
```

**Registration in `alert-engine.ts`:**

```typescript
await scanMixedContainerAlerts(db);  // additive line
```

**Idempotency:** Use existing `upsertControlTowerAlert` pattern with `(workspaceId, alertKey)` uniqueness.

---

## 6. Contracts extension (future)

Add to `packages/contracts/src/control-tower.ts`:

```typescript
export const MIXED_CONTAINER_ALERT_KEYS = [
  'mixedcontainer.offer.expiring_24h',
  'mixedcontainer.offer.expired',
  'mixedcontainer.allocation.pending_48h',
  'mixedcontainer.allocation.declined',
  'mixedcontainer.pricing.sla_breach',
  'mixedcontainer.sample.pending_approval_72h',
  'mixedcontainer.sample.shipment_overdue',
  'mixedcontainer.revision.repricing_stale',
  'mixedcontainer.revision.abandoned_with_expiring_offer',
  'mixedcontainer.execution.spawn_pending_24h',
  'mixedcontainer.execution.partial_spawn',
  'mixedcontainer.execution.allocation_unconfirmed_at_approval',
] as const;

export type MixedContainerAlertKey = typeof MIXED_CONTAINER_ALERT_KEYS[number];
```

Extend alert category enum:

```typescript
// Additive
'MIXED_CONTAINER'
```

---

## 7. Realtime events

No new socket event types required. Existing Control Tower events suffice:

| Event | When |
|-------|------|
| `controltower.alert.created` | Any MC alert upserted |
| `controltower.alert.resolved` | Condition cleared |
| `controltower.metric.updated` | MC pipeline metrics refresh |

Optional future buyer-facing events (not Control Tower):

| Event | Audience |
|-------|----------|
| `mixedcontainer.offer.expiring` | Buyer OWNER (T-24h) |
| `mixedcontainer.offer.published` | Buyer OWNER |

---

## 8. Interaction with existing alerts

| Existing alert | Interaction |
|----------------|-------------|
| RFQ deadline alerts | Independent — no shared conditions |
| CommodityBid auction alerts | Independent |
| Order proforma SLA | Fires on spawned Orders — normal behaviour post-MC execution |
| FreightIQ alerts | Fires on Order FreightIQ — normal behaviour post-MC execution |
| Shipment exceptions | Fires on spawned Shipments — normal behaviour |
| Market intelligence alerts | May **inform** catalog insights; no alert collision |

**Cross-workspace correlation (future enhancement):** Control Tower may group alerts by `spawned_from_id` lineage (MC → Orders → Shipments). Not required for Phase 1.

---

## 9. Metrics for Control Tower overview

| Metric key | Calculation |
|------------|-------------|
| `mixedcontainer.active.count` | Workspaces not in terminal state |
| `mixedcontainer.pricing.pending` | State = PRICING_REQUESTED or REPRICING_REQUESTED |
| `mixedcontainer.offers.pending_acceptance` | State = OFFER_PENDING |
| `mixedcontainer.execution.active` | State = EXECUTION_IN_PROGRESS or EXECUTION_ACTIVE |
| `mixedcontainer.avg_time_to_offer_hours` | Rolling 30d mean |
| `mixedcontainer.offer_accept_rate` | Accepted / published offers, 30d |

---

## 10. Implementation sequencing

| Sprint | Deliverable |
|--------|-------------|
| 12C | Pricing + allocation alerts (6 keys) |
| 12D | Sample + revision alerts (4 keys) |
| 12D | Execution alerts (3 keys) |
| 12E | Ops dashboard widgets + SLA metrics |

All scans are **additive** — ship behind feature flag `MIXED_CONTAINER_ENABLED` if co-deploying with partial runtime.

---

## 11. Constraints honoured

| Constraint | Status |
|------------|--------|
| No RFQ/CB/Order/Shipment FSM changes | ✓ |
| No FreightIQ module changes | ✓ |
| Additive alert keys only | ✓ |
| Alerts reference `workspaces` FK | ✓ |
| No business data duplication | ✓ — alerts query MC detail tables |
