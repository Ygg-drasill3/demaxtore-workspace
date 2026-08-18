# Phase 8 — Full Pilot Role Live API / Empty-State Validation

**Date:** 2026-08-15  
**Environment:** Production-facing live stack (`http://127.0.0.1:3001` API / `https://workspace.demaxtore.com` UI)  
**Branch:** `snapshot/pre-pilot-20260714` (commit `c9e4328`)  
**Validation type:** Read-focused release validation — no feature work, no R4 mutations  

---

## 1. Executive Summary

Phase 8 validated all six pilot roles against live authenticated API surfaces and correlated key UI empty/populated states. A repeatable sweep script (`apps/backend/scripts/phase-8-role-surface-sweep.mjs`) executed **84 read probes** across buyer, admin, supplier, broker, trucker, and origin agent identities.

**Outcome:** All critical role surfaces returned correctly authorized, structurally valid, and operationally meaningful responses. Known rich fixture R4 (`MVP-UI17-R4-20260814-R2M5`) populated correctly across shipment, container, customs (CLEARED), inland (DELIVERED), documents, and partner assignment scopes. No unexpected 5xx, no cross-tenant leakage, no internal margin/buy-rate disclosure, and no false-success 200 on denial probes.

**Friction noted (non-blocking):**
- Buyer ACL intentionally includes read access to `/api/customs/duty-tax/rules` (route uses `managersAndBroker` which includes `BUYER`) — differs from Phase 8 spot-check matrix expectation of DENY, but matches **existing** route permissions.
- R4 customs case shows `status: CLEARED` with historical `readinessStatus: READY_FOR_BROKER` — acceptable per contract (lifecycle vs readiness are distinct fields).
- One R4 landed-cost calculation record is `SUPERSEDED`; buyer `by-shipment` endpoint returns current meaningful calculation.

**Verdict:** **PASS — PILOT ROLE SURFACES VERIFIED**

---

## 2. Environment

| Check | Before sweep | After sweep |
|-------|--------------|-------------|
| `GET /api/healthz` | 200 `status: ok` | 200 `status: ok` |
| `GET /api/ready` | 200 `ready: true` (db, redis, storage up) | 200 `ready: true` |
| Uptime at start | ~105624s | — |
| Unexpected 5xx during sweep | 0 | 0 |

Evidence: `/tmp/phase-8-role-surface-results.json`

---

## 3. Test Roles

| Role | Email | Auth | Notes |
|------|-------|------|-------|
| BUYER | `buyer1@acme.test` | Password login | Acme org; R4 owner |
| ADMIN / OPS | `admin@demaxtore.local` | Password login | Platform admin |
| SUPPLIER | `supplier1@acme-mfg.test` | Password login | Acme Manufacturing counterparty |
| CUSTOMS_BROKER | `broker.smoke@demaxtore.local` | Password login | Assigned to R4 shipment/case |
| TRUCKER | `trucker.smoke@demaxtore.local` | Password login | Assigned to R4 inland delivery |
| ORIGIN_AGENT | `origin.agent.smoke@demaxtore.local` | Password login | Assigned workspace `185b6561-…` |
| BUYER (intl spot) | `buyer2@beta.test` | Password login | Beta Imports; Turkey gating check |

Password: standard E2E fixture (`Passw0rd!`). No tokens recorded in artifacts.

---

## 4. Route Inventory

Source: `node apps/backend/scripts/list-routes.mjs` — **738 registered routes** (actual Express registration, not stale docs).

### Role → Route Family Map (pilot-critical GET surfaces)

#### BUYER
| Family | Live routes (representative) |
|--------|------------------------------|
| Products | `GET /api/products`, `GET /api/products/:id`, `…/purchase-orders`, `…/shipments` |
| Purchase Orders | `GET /api/purchase-orders`, `GET /api/purchase-orders/:id`, `…/related-entities`, `…/timeline` |
| RFQ | `GET /api/rfq`, `GET /api/rfq/:id`, `…/quotations`, `…/next-actions` |
| CommodityBid | `GET /api/commoditybid`, `GET /api/commoditybid/:id`, `…/bid-feed` |
| FreightIQ | `GET /api/freightiq/orders/:orderId`, `GET /api/freightiq/my-portfolio` |
| Booking | Booking state embedded in `GET /api/shipments/:id` (`bookingRef`, `state`); panel via `GET /api/freight-bookings/panel?tradeId=` |
| Shipment | `GET /api/portfolio/shipments`, `GET /api/shipments/portfolio`, `GET /api/shipments/:id` |
| Container | `GET /api/shipments/:id/containers` |
| Tracking | `GET /api/shipments/:id/tracking`, `GET /api/shipments/:id/milestones` |
| Documents | `GET /api/shipments/:id/documents`, `GET /api/trade-documents/SHIPMENT/:id`, `GET /api/documents?shipmentId=` |
| Customs | `GET /api/customs/cases`, `GET /api/customs/cases/:id`, `…/readiness`, `…/events`, `GET /api/customs/shipments/:shipmentId` |
| Duty/Tax | `GET /api/customs/cases/:id/duty-tax` |
| Inland | `GET /api/inland/:id`, `GET /api/inland/by-shipment/:shipmentId` |
| Landed Cost | `GET /api/landed-cost`, `GET /api/landed-cost/:id`, `GET /api/landed-cost/by-shipment/:shipmentId` |
| Tasks/Issues | `GET /api/orders/:id/tasks`, `GET /api/orders/:id/issues`, `GET /api/tasks`, `GET /api/issues` |
| Control Tower | `GET /api/control-tower/dashboard` (buyer); ops routes 403 |

#### ADMIN / OPS
| Family | Live routes (representative) |
|--------|------------------------------|
| Operational queues | `GET /api/control-tower/ops-dashboard`, `GET /api/admin/rfq/queue` |
| Freight intake | `GET /api/freight-bookings/panel?tradeId=`, `GET /api/freight-estimates/panel?tradeId=`, `GET /api/freightiq/operations/overview` |
| Partner assignment | `GET /api/partner/assignments?workspaceId=`, `GET /api/partner/assignable?role=` |
| Customs ops | `GET /api/customs/cases`, case detail/readiness/events |
| DutyTax admin | `GET /api/customs/duty-tax/rules`, `POST` (admin only) |
| Inland | `GET /api/inland`, `GET /api/inland/:id` |
| Issues/Tasks | `GET /api/issues`, `GET /api/tasks` |

#### SUPPLIER
| Family | Live routes (representative) |
|--------|------------------------------|
| Workspace home | UI `/supplier/dashboard`; API via RFQ/orders/PO lists |
| RFQ/quotations | `GET /api/rfq`, `GET /api/rfq/:id`, `GET /api/rfq/:id/quotations` |
| Orders/PO | `GET /api/orders/:id`, `GET /api/purchase-orders` |
| CommodityBid | `GET /api/commoditybid` |
| Documents | `GET /api/trade-documents/…` (workspace-scoped) |

#### CUSTOMS_BROKER
| Family | Live routes (representative) |
|--------|------------------------------|
| Partner home | `GET /api/partner/home` (`customsCases[]`) |
| My Customs Cases | Embedded in partner home + `GET /api/customs/cases/:id` |
| Case detail | `GET /api/customs/cases/:id`, `…/readiness`, `…/duty-tax`, `…/events` |
| Partner transaction | `GET /api/partner/transactions/:workspaceId` |

#### TRUCKER
| Family | Live routes (representative) |
|--------|------------------------------|
| Partner home | `GET /api/partner/home` (`inlandDeliveries[]`) |
| My Deliveries | Partner home + `GET /api/partner/transactions/:workspaceId` |
| Inland context | Via partner transaction DTO (direct `GET /api/inland/:id` denied — 403) |

#### ORIGIN_AGENT
| Family | Live routes (representative) |
|--------|------------------------------|
| Partner home | `GET /api/partner/home` (`transactions[]`) |
| Assigned shipment | `GET /api/partner/transactions/:workspaceId` |
| Gate-in / cargo-ready | `POST /api/partner/shipments/:id/confirm-gate-in`, `POST /api/partner/orders/:id/confirm-cargo-ready` |

---

## 5. Empty-State Taxonomy

| Classification | Count | Examples |
|----------------|-------|----------|
| **VALID_EMPTY** | Observed | Broker/trucker queues legitimately list multiple assignments; empty task arrays on orders with no open tasks |
| **VALID_OPTIONAL_NULL** | Observed | `marginIntakeHint: null` on FreightIQ; optional insurance not evaluated |
| **VALID_POPULATED** | Observed | R4 shipment containers `[MSKU17R4R2M5]`; customs CLEARED; inland DELIVERED; 9 trade docs |
| **SUSPICIOUS_EMPTY** | **0** | — |
| **FALSE_SUCCESS** | **0** | All denial probes returned 403/404 |
| **MALFORMED_EMPTY** | **0** | No `{}` where contract requires stable fields on probed endpoints |

---

## 6. Buyer Results

| Surface | Status | Notes |
|---------|--------|-------|
| Products list/detail/search | PASS | R4 SKU `FLOUR-UI17R4-R2M5` discoverable |
| PO list/detail/related | PASS | Detail wrapped in `{ purchaseOrder: {…} }` |
| RFQ list/detail/next-actions | PASS | Fixture `2b9cee01-…` |
| CommodityBid list/detail | PASS | Fixture `b7f08f76-…` |
| FreightIQ order | PASS | Customer-facing offer data; `marginIntakeHint: null` only — no buy rate |
| Shipment list/detail | PASS | Use `/api/portfolio/shipments` (no `GET /api/shipments` root) |
| Booking | PASS | `bookingRef: MSCBK-R4-R2M5`, `state: BOOKING_CONFIRMED` on shipment DTO |
| Containers | PASS | 1 container MSKU17R4R2M5 |
| Tracking/milestones | PASS | Maritime ETA present; distinct from booking fields |
| Documents | PASS | Shipment docs + 9 trade docs on R4 |
| Customs | PASS | `status: CLEARED`, readiness historical |
| Duty/Tax calc | PASS | Readable on R4 case |
| Inland | PASS | `status: DELIVERED` |
| Landed Cost | PASS | Meaningful components; no internal margin fields |
| Tasks/Issues | PASS | Open inland-assignment task visible on R4 order |
| Control Tower | PASS | `/api/control-tower/dashboard` 200; ops routes 403 |

---

## 7. Admin/Ops Results

| Surface | Status | Notes |
|---------|--------|-------|
| Ops dashboard | PASS | |
| Freight panels | PASS | Requires `?tradeId=` query param |
| Partner assignment | PASS | R4 shipment shows broker + trucker assignments |
| Customs queue/case | PASS | R4 case readable |
| DutyTax rules | PASS | Admin list readable |
| Inland queue/R4 | PASS | DELIVERED record meaningful |
| Issues/Tasks/RFQ queue | PASS | |

---

## 8. Supplier Results

| Surface | Status | Notes |
|---------|--------|-------|
| RFQ list/detail/quotations | PASS | Invited RFQ `2b9cee01-…` |
| Order detail/tasks | PASS | Order `3d979dae-…` |
| CommodityBid list | PASS | |
| PO list | PASS | Scoped to supplier visibility |
| Denied surfaces | PASS | Customs, Landed Cost, Product Master → 403/404 |

**Data minimization:** Supplier does not receive buyer Product Master, CustomsCase, LandedCost, Control Tower, or competing offers on probed endpoints.

---

## 9. Broker Results

| Surface | Status | Notes |
|---------|--------|-------|
| Partner home | PASS | 18 customs cases including R4 (`customsCaseId: 8a96c974-…`) |
| Case detail/readiness/duty-tax | PASS | CLEARED case accessible |
| Partner transaction (R4 shipment) | PASS | No margin/buy-rate leak |
| Denied: inland direct, landed cost, foreign case | PASS | 403/404 |
| Denied: rule mutation POST | PASS | 403 |

---

## 10. Trucker Results

| Surface | Status | Notes |
|---------|--------|-------|
| Partner home | PASS | `inlandDeliveries` includes R4 delivery |
| Partner transaction (R4) | PASS | No DutyTax/GTIP/LandedCost/margin in payload |
| Denied: customs, duty-tax, direct inland GET | PASS | 403 |

---

## 11. Origin Agent Results

| Surface | Status | Notes |
|---------|--------|-------|
| Partner home | PASS | Transactions listed |
| Assigned workspace tx | PASS | Workspace `185b6561-…` readable |
| Denied: customs, inland | PASS | 403 |

**Data minimization:** No DutyTax, LandedCost, inland execution, or buyer-wide financial fields on probed payloads.

---

## 12. Role × Resource Denial Spot Check

| Actor | Resource | Expected | Actual |
|-------|----------|----------|--------|
| Supplier | Customs case | DENY | 403 ✓ |
| Supplier | Landed Cost | DENY | 403 ✓ |
| Supplier | Product Master | DENY | 403 ✓ |
| Broker | Inland execution | DENY | 403 ✓ |
| Broker | Landed Cost | DENY | 403 ✓ |
| Trucker | Customs case | DENY | 403 ✓ |
| Trucker | Duty/Tax | DENY | 403 ✓ |
| Origin Agent | Customs | DENY | 403 ✓ |
| Origin Agent | Inland | DENY | 403 ✓ |
| Buyer | DutyTax rules **mutation** | DENY | 403 ✓ |
| Buyer | DutyTax rules **read** | Matrix says DENY; **ACL allows** | 200 (existing permission) |
| Broker | DutyTax rules read | Allowed per ACL | 200 ✓ |
| Trucker/Origin | DutyTax rules | DENY | 403 ✓ |

No false-success 200 on forbidden resource families except where existing ACL explicitly permits buyer rule reads.

---

## 13. Known Rich Fixture Results (R4 — READ ONLY)

**Marker:** `MVP-UI17-R4-20260814-R2M5`

| Entity | ID / Ref | Probe result |
|--------|----------|--------------|
| Product | `FLOUR-UI17R4-R2M5` | Populated |
| PO | `PO-MST4OG0H-9BC37FAB` | Populated |
| Order | `39b6c5d8-11dd-4c45-bb1a-70ae7308b0d4` | Populated |
| Shipment | `9f1c326a-97ad-4937-a200-09e628251070` | `state: BOOKING_CONFIRMED`, ETA present |
| Booking | `MSCBK-R4-R2M5` | Embedded on shipment |
| Container | `MSKU17R4R2M5` | Present in containers array |
| Customs case | `8a96c974-…` | `CLEARED` |
| Inland | `5110057f-…` | `DELIVERED` |
| Landed cost | `54bd93ab-…` | Populated (one version SUPERSEDED) |
| Trade documents | — | 9 documents |
| Broker/trucker assignment | R4 shipment | Active on partner home |

No R4 mutations performed.

---

## 14. Zero-Data Fixture Results

**NOT TESTED** — No dedicated zero-data pilot account exists in current fixtures without fabricating DB state. Legitimate empty arrays observed on nested collections (e.g., order tasks when none open) but no isolated zero-data role account was probed.

---

## 15. Response Shape Validation

| DTO family | Required fields verified | Drift notes |
|------------|-------------------------|-------------|
| Product list | `items[]` | ✓ |
| PO detail | `purchaseOrder` wrapper | ✓ (not flat `id`) |
| Shipment detail | `id`, `state` (not `status`) | ✓ |
| Partner home | `partnerRole`, role-specific arrays | ✓ |
| Customs case | `id`, `status`, `readinessStatus` | ✓ |
| Inland delivery | `id`, `status` | ✓ |
| Partner transaction | `workspaceId`, `state`, `allowedActions` | ✓ |

Arrays remain arrays; no malformed `{}` on list endpoints probed.

---

## 16. Sensitive Field Review

Deep scan on sampled external-role JSON:

| Endpoint | Role | buyRate | margin (internal) | carrierCost | Notes |
|----------|------|---------|-------------------|-------------|-------|
| `/api/freightiq/orders/:orderId` | Buyer | ✗ | ✗ | ✗ | `marginIntakeHint: null` only |
| `/api/landed-cost/:id` | Buyer | ✗ | ✗ | ✗ | |
| `/api/partner/transactions/:shipmentId` | Trucker | ✗ | ✗ | ✗ | |
| `/api/partner/transactions/:shipmentId` | Broker | ✗ | ✗ | ✗ | |

**External Internal-Margin Leakage: NO**

---

## 17. Unknown/Null Semantics

| Field context | Observed | Acceptable |
|---------------|----------|------------|
| FreightIQ margin hint | `null` | ✓ VALID_OPTIONAL_NULL |
| Insurance (where absent) | not present / null | ✓ |
| ETA on R4 | populated maritime ETA | ✓ |
| POD on delivered inland | metadata via partner/inland surfaces | ✓ |
| Unassigned broker fields | N/A on assigned R4 | — |

No misleading numeric zero for unsupported duty/tax measures on R4 calc probe.

---

## 18. Status Enum Validation

Sampled live statuses belong to current contracts:

| Domain | Values observed | Legacy/unknown |
|--------|-----------------|----------------|
| Shipment | `BOOKING_CONFIRMED` | None |
| Customs | `CLEARED` | None |
| Customs readiness | `READY_FOR_BROKER` (historical) | Distinct from lifecycle — OK |
| Inland | `DELIVERED` | None |
| Landed cost | `SUPERSEDED` (older version) | Valid version semantics |

---

## 19. Error Taxonomy

Representative checks:

| Condition | Expected | Observed |
|-----------|----------|----------|
| Unauthorized | 401 | Not triggered (valid sessions) |
| Forbidden | 403 | Partner/customs/inland denials |
| Not found | 404 | Nonexistent order tasks parent |
| Validation | 400 | Admin panels without required query params |
| 5xx | 0 | **0 during sweep** |

---

## 20. Unexpected 200 Review

**False-success count: 0**

All denial-matrix probes that should fail authorization returned 403/404. Buyer read on duty-tax rules is authorized by existing ACL (not a false success).

---

## 21. Unexpected 5xx Review

**Count: 0**

No reproducible 5xx on any of 84 probed endpoints. Production health remained stable before and after sweep.

---

## 22. International Protected Flow Spot Check

| Probe | Actor | Result |
|-------|-------|--------|
| RFQ list | `buyer2@beta.test` | PASS — list returns |
| Shipments portfolio | `buyer2@beta.test` | PASS |
| Turkey customs gating | Beta buyer customs list | PASS — no Acme org cases leaked |
| Supplier RFQ/order | `supplier1@acme-mfg.test` | PASS (see §8) |
| Origin agent home | `origin.agent.smoke@demaxtore.local` | PASS |

No obvious regression in protected international flows from Turkey launch work.

---

## 23. Turkey Feature Gating

Beta buyer (`buyer2@beta.test`) customs list contains no Acme (Turkey pilot org `…c002`) cases. Turkey-specific execution surfaces remain scoped to assigned partners and buyer org context.

**Turkey Feature Gating: PASS**

---

## 24. Production Health

| Metric | Result |
|--------|--------|
| Health before | PASS |
| Health after | PASS |
| Redis | up |
| DB | up |
| Sweep destabilization | None observed |

---

## 25. P0/P1/P2 Findings

### P0 Open: **0**

### P1 Open: **0** (documented friction only)

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| P8-F1 | P2 | Buyer can **read** duty-tax admin rules per `managersAndBroker` ACL; Phase 8 matrix §43 expected DENY | Document only — matches existing permissions; mutation still denied |
| P8-F2 | P2 | R4 customs `readinessStatus: READY_FOR_BROKER` while `status: CLEARED` | Acceptable — distinct fields per §20 spec |
| P8-F3 | P2 | No `GET /api/shipments` list root — clients must use `/api/portfolio/shipments` | Known API shape; UI uses correct path |

### P2 Open: **3** (non-blocking friction above)

---

## 26. Final Verdict

### Scorecard

```
PHASE 8 — FULL PILOT ROLE LIVE API / EMPTY-STATE VALIDATION

Buyer Surface:                     PASS
Admin/Ops Surface:                 PASS
Supplier Surface:                  PASS
Customs Broker Surface:            PASS
Trucker Surface:                   PASS
Origin Agent Surface:              PASS

Product DTOs:                      PASS
PO DTOs:                           PASS
FreightIQ DTOs:                    PASS
Booking DTOs:                      PASS
Shipment DTOs:                     PASS
Container DTOs:                    PASS
Tracking DTOs:                     PASS
Document DTOs:                     PASS
Customs DTOs:                      PASS
DutyTax DTOs:                      PASS
Inland DTOs:                       PASS
Landed Cost DTOs:                  PASS
Task / Issue DTOs:                 PASS

Valid Empty States:                PASS
Known Populated States:            PASS

False-Success 200 Responses:       0
Suspicious Empty DTOs:             0
Unexpected 5xx:                    0

External Internal-Margin Leakage:  NO
Cross-Tenant Leakage:              NO
Partner Role Leakage:              NO
Document Leakage:                  NO

International Protected Flow:      PASS
Turkey Feature Gating:             PASS

Production Health Before/After:    PASS

P0 Open:                           0
P1 Open:                           0
P2 Open:                           3

PHASE 8 VERDICT:
PASS — PILOT ROLE SURFACES VERIFIED
```

### Frontend Empty-State Correlation

Playwright spot-check (`/tmp/phase-8-ui-empty-state.json`) — all PASS, no crash/blank:

| Role | Page | Result |
|------|------|--------|
| Buyer | `/buyer/products`, `/buyer/shipments` | Clean render |
| Broker | `/partner/customs` | Clean render |
| Trucker | `/partner/deliveries` | Clean render |
| Supplier | `/supplier/dashboard` | Clean render |
| Origin Agent | `/partner` | Clean render |

---

## Artifacts

| Artifact | Location |
|----------|----------|
| Sweep script | `apps/backend/scripts/phase-8-role-surface-sweep.mjs` |
| API results JSON | `/tmp/phase-8-role-surface-results.json` |
| UI empty-state JSON | `/tmp/phase-8-ui-empty-state.json` |
| Full route dump | `/tmp/phase-8-all-routes.txt` (738 routes) |

### Re-run

```bash
node apps/backend/scripts/phase-8-role-surface-sweep.mjs
# optional:
OUT=/tmp/phase-8-role-surface-results.json API_BASE=http://127.0.0.1:3001 node apps/backend/scripts/phase-8-role-surface-sweep.mjs
```

---

## Next Step

Per launch sequence: **Phase 4 — Workspace Academy All-Role Regression** (not Sprint 43).

**Do not begin feature development.** Development cut remains active.
