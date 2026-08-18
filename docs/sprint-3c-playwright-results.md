# Sprint 3C — Playwright Results

**Run date:** 2026-06-03  
**Environment:** localhost:3000 (frontend), localhost:8001 (backend)

---

## Shipment suite (`06-shipment-flow.spec.ts`)

| # | Test | Result |
|---|------|--------|
| 01 | Bootstrap order to FREIGHT_REQUESTED and spawn shipment | PASS |
| 02 | Booking confirmed (two-step) | PASS |
| 03 | Container assigned | PASS |
| 04 | Loaded on vessel | PASS |
| 05 | In transit | PASS |
| 06 | Arrived destination | PASS |
| 07 | Customs clearance | PASS |
| 08 | Delivered and completed | PASS |
| 09 | Timeline and audit verification | PASS |

**Shipment total: 9/9 PASS** (7.6s)

---

## Regression suites

| Suite | Tests | Result |
|-------|-------|--------|
| `02-rfq-flow.spec.ts` | 11 | PASS |
| `04-commoditybid-flow.spec.ts` | 7 | PASS |
| `05-order-flow.spec.ts` | 19 | PASS |

**Regression total: 35/35 PASS** (44.5s)

---

## Combined E2E

| Area | Count |
|------|-------|
| Shipment | 9 |
| Regression | 35 |
| **Grand total** | **44 PASS** |

---

## Verified behaviours

- Timeline events on shipment workspace (`shipment.created`, `shipment.booking.confirmed`, `shipment.completed`, …)
- Parent order timeline includes `shipment.spawned`
- State progression through UI action buttons (`data-testid="shipment-action-*"`)
- Spawn idempotency on repeated freight triggers (same `SHP-{orderRef}`)
