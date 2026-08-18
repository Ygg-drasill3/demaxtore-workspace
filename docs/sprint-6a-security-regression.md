# Sprint 6A — Security Regression

**Date:** 2026-06-04 (closure gate re-run)  
**Status:** **PASS**

---

## Requirements

| Role | Must NOT see | Must see |
|------|----------------|----------|
| Buyer | `internal_cost_usd`, `freightiq_margin_usd`, revenue ledger | Display price; CIF summary (no margin) |
| Supplier | Same as buyer | Display price; CIF summary (no margin) |
| Admin | — | Cost, margin, display price, ledger, metrics |

---

## Automated evidence — Playwright `16-freight-commercialization.spec.ts`

| Test | Result |
|------|--------|
| Admin sees `commercial` (cost, margin, display) | PASS |
| Buyer: `commercial` undefined; `price` = display | PASS |
| Supplier: `commercial` undefined; `price` = display | PASS |
| CIF: FOB + display freight only | PASS |
| Ledger PENDING on selection; REALIZED on completion | PASS |

---

## API evidence (closure re-run)

| Endpoint | Buyer | Admin |
|----------|-------|-------|
| `GET /api/freightiq/commercial/report` | **403** | **200** |
| `GET /api/freightiq/commercial/metrics` | (not authorized) | **200** |
| `GET /api/freightiq/orders/:id` — `offer.commercial` | **absent** | present when offer has commercial data |

```text
buyer → GET /api/freightiq/commercial/report → 403 Forbidden
admin → GET /api/freightiq/commercial/report → 200 OK
buyer freight summary → buyerNoCommercial: PASS
```

---

## Realtime (design review)

Events `freight.commercial.updated`, `freight.margin.updated`, `freight.revenue.realized` emitted via `emitToRole("ADMIN", …)` — not broadcast to buyer/supplier workspace channels.

---

## Regression vs Sprint 6A

No security test failures. No widening of commercial fields to non-admin roles in API responses.

---

## Gate

| Check | Status |
|-------|--------|
| Buyer isolation | **PASS** |
| Supplier isolation | **PASS** |
| Admin visibility | **PASS** |
| Ledger API restricted | **PASS** |

**Overall: PASS**
