# Sprint 6A — Regression Report (Closure Gate — Re-run)

**Date:** 2026-06-04 (post Release Blocker Fix Pack)  
**Environment:** Backend restart → `http://localhost:8001` (fresh `uptimeSec` &lt; 60s), Frontend `http://localhost:3000`, Postgres up, Chromium installed.

## Question

Did FreightIQ Commercialization introduce any regression anywhere in DeMaxtore?

## Answer

**No.** Full platform regression is green after the Release Blocker Fix Pack (upload storage, scheduler lock, pilot E2E corrections).

---

## Phase 1 — Database health

```text
npx prisma migrate status
→ 15 migrations found
→ Database schema is up to date!

npx prisma generate
→ ✔ Generated Prisma Client (v5.22.0)
```

| Check | Status |
|-------|--------|
| Pending migrations | None |
| Failed migrations | None |
| `freight_revenue_ledger` | Present |
| `freight_offers` commercial columns | Present |
| Indexes (shipment_id, order_id, created_at, status) | Present |

---

## Phase 2 — Backend health

```json
GET /api/healthz → {"status":"ok","db":"up","uptimeSec":18,...}
```

Backend restarted before gate. No startup exceptions observed.

---

## Phase 3 — Contract tests

```text
yarn workspace @dmx/contracts test

Test Files  10 passed (10)
     Tests  65 passed (65)
```

Covers: RFQ, CommodityBid, Order, Shipment FSMs; FreightIQ; freight-communications; workspace-communication; trade-documents; purchase-order.

---

## Phase 4 — Backend tests

```text
apps/backend vitest run (after backend stable)

Test Files  6 passed (6)
     Tests  13 passed (13)
```

| Suite | Result |
|-------|--------|
| state-guard | PASS (2) |
| workspace-policy (socket ACL routing) | PASS (2) |
| scheduler-lock | PASS (1) |
| commoditybid.sealed-bid (HTTP) | PASS (3) |
| commoditybid.scheduler (HTTP) | PASS (2) |
| tracking.diff | PASS (3) |

**Note:** First vitest attempt immediately after kill/restart hit `ECONNREFUSED` (race). Retry after healthz stable: **13/13 PASS**.

---

## Phase 5 — Playwright full regression

```text
cd apps/e2e && npx playwright test

125 passed (1.6m)
0 failed
0 skipped
```

All required suites **PASS** (01–16).

---

## Phase 6 — Critical business journeys

| Journey | Evidence | Verdict |
|---------|----------|---------|
| A — RFQ → PO → Order | `02-rfq-flow`, `05-order-flow` | **PASS** |
| B — CommodityBid → Order | `04-commoditybid-flow` | **PASS** |
| C — Order → Shipment → Tracking → Delivered | `06-shipment-flow`, `09-maritime-tracking` | **PASS** |
| D — FreightIQ commercial | `10`, `11`, `16-freight-commercialization` | **PASS** |

---

## Phase 7 — Security regression

| Check | Result |
|-------|--------|
| Buyer `GET /freightiq/commercial/report` | **403** |
| Admin commercial report / metrics | **200** |
| Buyer freight offers: no `commercial` field | **PASS** |
| CIF summary: no margin exposure | Covered in `16` test 04 |

---

## Phase 8 — Control Tower regression

```text
POST /api/control-tower/scan → 200
GET /api/control-tower/overview → 200
```

Freight, communication, trade-doc, tracking alert families still active after scan.

---

## Phase 9 — Performance smoke

| Endpoint | HTTP |
|----------|------|
| `GET /api/orders?limit=5` | 200 |
| `GET /api/control-tower/overview` | 200 |
| `GET /api/freightiq/operations/overview` | 200 |
| `GET /api/freightiq/commercial/metrics` | 200 |

No 500 errors on sampled dashboards.

---

## Module checklist

| Module | Status |
|--------|--------|
| RFQ | PASS |
| CommodityBid | PASS |
| PO | PASS |
| Order | PASS |
| Shipment | PASS |
| Trade Docs | PASS |
| Communication | PASS |
| FreightIQ | PASS |
| Control Tower | PASS |
| Maritime Tracking | PASS |
| Pilot Readiness | PASS |
| Production Hardening | PASS |
| Freight Commercialization (6A) | PASS |

---

## Closure gate

| Criterion | Met |
|-----------|-----|
| All regression suites PASS | **Yes** |
| All critical journeys PASS | **Yes** |
| Release verdict YES | **Yes** (see release-verdict.md) |

**Sprint 6A status: CLOSED**

---

## Prerequisite (Release Blocker Fix Pack)

Before this re-run, [sprint-6a-release-blocker-fixpack.md](./sprint-6a-release-blocker-fixpack.md) addressed upload storage, scheduler advisory lock, and pilot orders-bucket E2E assertions.
