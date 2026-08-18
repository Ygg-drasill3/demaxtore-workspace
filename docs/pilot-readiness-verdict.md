# Pilot Readiness — Product Verdict

**Date:** 2026-06-04  
**Question:** Can a first-time buyer successfully navigate from RFQ to Order and Shipment without training?

---

## Verdict

**MOSTLY YES**

---

## Rationale

### What now works (fix pack)

1. **Orders discovery** — Buyer/supplier/admin can open **Orders** in the sidebar and reach any spawned order without returning to RFQ lists.
2. **RFQ → Order handoff** — After `PO_ISSUED`, the RFQ workspace shows spawned orders with **Open order**, and the What Happens Next fallback CTA navigates to the order workspace when `orderId` is available.
3. **Order → Shipment** — Unchanged but reachable from the order workspace shipment links (existing runtime).
4. **Navigation honesty** — Primary sidebar no longer advertises Documents, Messages, or other placeholder screens.

### Remaining gaps (acceptable for pilot, not blockers for this pack)

| Gap | Impact |
|-----|--------|
| Dashboards still use MOCK data | First login “open work” not on dashboard |
| No PO / Shipment top-level lists | Users find PO inside Order; shipments via Order or notifications |
| Supplier CommodityBid menu removed | CB still via invitation/deep link; list page out of scope |
| Timeline labels still technical on Order | Minor comprehension friction |

### Training-free path (happy path)

```
RFQ list → Create/submit RFQ → Select supplier → Issue PO
  → RFQ workspace: Open order (spawned panel or WHN)
  → Order workspace → Book shipment → Open shipment link
```

Alternative: **Orders** menu after PO issue — no RFQ page required.

---

## Recommendation before paid pilot

1. Run `15-pilot-readiness.spec.ts` + full E2E regression on staging.
2. Smoke-test with a fresh buyer account (not power-user URLs).
3. Optional follow-up (not this pack): FIX-04 live dashboard, FIX-07 supplier CB list.

---

## Audit mapping

| Finding | Resolution |
|---------|------------|
| PCA-001, NAV-001 | FIX-01 + FIX-03 |
| PCA-003, UJA-B02 | FIX-02 |
| PLI-005 | FIX-01 + FIX-02 |
