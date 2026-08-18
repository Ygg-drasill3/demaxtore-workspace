# PHASE 5 — SALES CONTROL REGRESSION

**Report date:** 17 August 2026  
**Type:** Release validation / Sales Control / protected-flow regression  
**Environment:** Production — `https://workspace.demaxtore.com`  
**Backend:** `demaxtore-workspace-backend.service` (port 3001)  
**Commit:** `c9e4328d8fd0aef5ce743013bf378e6e35add538` (branch `snapshot/pre-pilot-20260714`)  
**Constraints honored:** No R4 mutation · No Customer #1 records · No product changes · No Academy remediation

---

## 1. Executive Summary

Phase 5 audited and regression-tested the **current** Sales Control implementation. Sales Control is **mounted and operational** for `ADMIN` and `SALES_CONTROL` roles. It is a **customer account management surface** (buyer/supplier onboarding, branding uploads, password reset) — **not** a CRM with leads/opportunities.

**Key results:**

| Area | Result |
|---|---|
| Internal Sales Control surface | **PASS** — dashboard loads, list/detail DTOs meaningful |
| External role denial (API) | **PASS** — 403 on all tested `/api/sales/*` routes |
| Internal margin / buy-rate leakage | **NO** |
| Sales API cross-tenant leakage to external roles | **NO** |
| Turkey pilot non-interference | **PASS** — R4 PO/product/shipment fixtures remain accessible |
| International protected flow spot-check | **PASS** — RFQ + CommodityBid list endpoints 200 for admin |
| Unexpected Sales Control 5xx | **0** |
| P0 findings | **0** |
| P1 findings | **1** — supplier logo/catalog asset IDOR via `/api/supplier-organisations/:orgId/*` |

**Verdict:** **PASS WITH DOCUMENTED NON-BLOCKING FRICTION** — Sales Control coexists safely with the Turkey pilot and protected flows. One P1 asset-scoping gap on supplier branding delivery endpoints should be tracked for post-pilot hardening; it does not block controlled paid pilot launch under current risk acceptance.

---

## 2. Environment

| Item | Value |
|---|---|
| API base | `https://workspace.demaxtore.com/api` |
| Health before | `GET /api/healthz` → `{"status":"ok"}` |
| Ready before | `GET /api/ready` → `{"ready":true,"checks":{"db":"up","redis":"up","storage":"up",...}}` |
| Health after | `{"status":"ok"}` |
| Ready after | `{"ready":true}` |
| Test password | `Passw0rd!` (seeded accounts) |
| R4 marker | `MVP-UI17-R4-20260814-R2M5` (read-only, not mutated) |

**Test accounts used (read-only unless noted):**

| Role | Email |
|---|---|
| ADMIN | `admin@demaxtore.local` |
| BUYER | `buyer1@acme.test` |
| SUPPLIER | `supplier1@acme-mfg.test` |
| CUSTOMS_BROKER | `broker.smoke@demaxtore.local` |
| TRUCKER | `trucker.smoke@demaxtore.local` |
| ORIGIN_AGENT | `origin.agent.smoke@demaxtore.local` |

**Note:** No `SALES_CONTROL`-role users exist in production DB; `ADMIN` is the live access path. Role contract and routes support `SALES_CONTROL` when provisioned.

---

## 3. Sales Control Architecture

Sales Control is a **thin internal operations module** for managing external buyer/supplier accounts:

```
Frontend                          Backend                         Data
────────                          ───────                         ────
/sales/dashboard          →       GET/PATCH/DELETE /api/sales/customers/*
  SalesControlDashboardPage       POST  /api/sales/customers
                                  POST  /api/sales/customers/:id/logo      [uploadLimiter]
                                  POST  /api/sales/customers/:id/catalog   [uploadLimiter]
                                  PUT   /api/sales/customers/:id/catalog-link
                                  POST  /api/sales/customers/:id/reset-password
                                  GET   /api/sales/interest-categories

/sales/rfq                →       (shared RFQ module — not sales-specific API)
/sales/control-tower      →       (shared Import Control Tower — not sales-specific API)

Branding assets served via:
  /api/supplier-organisations/:orgId/logo
  /api/supplier-organisations/:orgId/catalog
```

**Data ownership model:**

- Customer = `User` with role `BUYER` or `SUPPLIER`, excluding `@demaxtore.com` emails.
- Organisation name, interest areas, logo/catalog stored on linked `Organisation`.
- `listRecent()` is **platform-wide** for internal roles (all non-internal customer accounts). `actorId` is accepted but not used for scoping — intentional for DeMaxtore internal portfolio management.
- Internal staff records return **404** (`CUSTOMER_NOT_FOUND`) rather than exposing admin users.

**Not present (deprecated / never built in current code):**

- Lead objects
- Opportunity / pipeline CRM
- Internal sales notes on accounts
- Sales-specific activity/messaging threads
- Sales Control widgets on admin command center (admin nav links to Sales Control page only)

---

## 4. Route Inventory

### Backend — `/api/sales/*` (mounted at `apps/backend/src/routes.ts:161`)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/sales/customers` | ADMIN, SALES_CONTROL | List customer accounts (limit 50, optional `q`, `role`, `category`) |
| POST | `/sales/customers` | ADMIN, SALES_CONTROL | Create buyer/supplier account + org |
| GET | `/sales/customers/:id` | ADMIN, SALES_CONTROL | Customer detail + teammates |
| PATCH | `/sales/customers/:id` | ADMIN, SALES_CONTROL | Update name/email/org/whatsapp |
| DELETE | `/sales/customers/:id` | ADMIN, SALES_CONTROL | Delete customer + orphan org cleanup |
| POST | `/sales/customers/:id/logo` | ADMIN, SALES_CONTROL | Upload logo (`uploadLimiter`) |
| POST | `/sales/customers/:id/catalog` | ADMIN, SALES_CONTROL | Upload PDF catalog (`uploadLimiter`) |
| PUT | `/sales/customers/:id/catalog-link` | ADMIN, SALES_CONTROL | Set external catalog URL |
| POST | `/sales/customers/:id/reset-password` | ADMIN, SALES_CONTROL | Reset customer password |
| GET | `/sales/interest-categories` | ADMIN, SALES_CONTROL | Distinct org interest labels |

### Related asset delivery — `/api/supplier-organisations/*`

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/supplier-organisations/:orgId/logo` | **Any authenticated** | Stream org logo |
| GET | `/supplier-organisations/:orgId/catalog` | **Any authenticated** | Stream org catalog PDF |

### Frontend — mounted routes (`apps/frontend/src/routes/index.tsx`)

| Path | Component | Guard |
|---|---|---|
| `/sales/dashboard` | `SalesControlDashboardPage` | `RequireRole(["SALES_CONTROL","ADMIN"])` |
| `/sales/rfq` | `RfqListPage` (shared) | same |
| `/sales/control-tower` | `ControlTowerDashboard` (shared) | same |
| `/admin/users` | Redirect → `/sales/dashboard` | ADMIN |
| `/sales/whatsapp` | Redirect → `/messages?channel=WHATSAPP` | — |

**Stale route check:** All mounted frontend Sales Control paths have corresponding backend APIs or shared module APIs. No mounted component calls a missing `/api/sales/*` endpoint.

---

## 5. Frontend Mount Inventory

| Surface | Status | Notes |
|---|---|---|
| `SalesControlDashboardPage` | **MOUNTED** | `data-testid="sales-control-dashboard"` — list, detail, create, branding, reset, delete |
| `SupplierBrandingUploadFields` | **MOUNTED** | Used in dashboard modals |
| `RfqListPage` at `/sales/rfq` | **MOUNTED** | Shared RFQ list for sales portfolio oversight |
| `ControlTowerDashboard` at `/sales/control-tower` | **MOUNTED** | Shared import control tower |
| Lead / Opportunity pages | **NOT PRESENT** | No frontend CRM lead/opportunity code in `features/sales-control/` |
| Sales dashboard widgets on `/admin/dashboard` | **NOT MOUNTED** | Admin sees nav link only |
| Workspace Academy guides for `/sales/*` | **MOUNTED** | Phase 4 stub context — not remediated per Phase 5 scope |

---

## 6. Role / Permission Matrix

| Role | `/api/sales/*` | `/sales/dashboard` UI | Nav visibility | Notes |
|---|---|---|---|---|
| ADMIN | **ALLOW** | **ALLOW** | "Sales Control" in admin nav | Live access path |
| SALES_CONTROL | **ALLOW** | **ALLOW** | `SALES_CONTROL_NAV_GROUPS` | Role supported; no prod users currently |
| BUYER | **DENY 403** | Redirect to `/buyer/dashboard` | None | Verified API + `NAV_GROUPS_BY_ROLE` |
| SUPPLIER | **DENY 403** | Redirect to `/supplier/dashboard` | None | Verified |
| CUSTOMS_BROKER | **DENY 403** | Redirect to `/partner` | Partner nav only | Verified |
| TRUCKER | **DENY 403** | Redirect to `/partner` | Partner nav only | Verified |
| ORIGIN_AGENT | **DENY 403** | Redirect to `/partner` | Partner nav only | Verified |
| OPS_MANAGER / platform ops | **DENY 403** on `/sales/*` | No `/sales/*` in `ADMIN_NAV_GROUPS` unless ADMIN | Uses admin nav without Sales Control unless ADMIN role |

**Buyer intentional visibility:** Buyers may see supplier logos in RFQ contexts via separate RFQ UI — not via Sales Control API.

---

## 7. Internal Role Results

**Actor:** `admin@demaxtore.local`

| Check | Result |
|---|---|
| Login | 200 |
| `GET /api/sales/customers` | 200 — 50 accounts returned |
| `GET /api/sales/interest-categories` | 200 |
| `GET /api/sales/customers/:id` | 200 — detail with `teammates[]` |
| `GET /api/sales/customers?q=acme` | 200 — 5 matches |
| UI `/sales/dashboard` | **PASS** — page renders, customer list populated, no blank screen / redirect loop |
| Auth refresh | No logout loop observed during navigation admin dashboard → sales dashboard |

**Representative populated record:** `164aca0e-44e4-48ed-a7b4-135443df674a` (`pilot.turkey@demaxtore.local`) — valid DTO with organisation, interest areas, phone fields.

---

## 8. Buyer Access Boundary

| Endpoint | Status | Expected |
|---|---|---|
| `GET /api/sales/customers` | **403** | DENY |
| `GET /api/sales/interest-categories` | **403** | DENY |
| `GET /api/sales/customers/:id` | **403** | DENY |
| `POST /api/sales/customers/:id/logo` | **403** | DENY |

**Payload leak scan on buyer PO + shipment (R4 fixtures):** No `margin`, `buyRate`, `internal*`, `spread`, `commission` fields.

**Result: PASS**

---

## 9. Supplier Access Boundary

| Endpoint | Status |
|---|---|
| `GET /api/sales/customers` | **403** |
| `GET /api/sales/interest-categories` | **403** |

**Result: PASS**

---

## 10. Broker Access Boundary

| Endpoint | Status |
|---|---|
| `GET /api/sales/customers` | **403** |
| `GET /api/sales/interest-categories` | **403** |

**Result: PASS**

---

## 11. Trucker Access Boundary

| Endpoint | Status |
|---|---|
| `GET /api/sales/customers` | **403** |
| `GET /api/sales/interest-categories` | **403** |

**Result: PASS**

---

## 12. Origin Agent Access Boundary

| Endpoint | Status |
|---|---|
| `GET /api/sales/customers` | **403** |
| `GET /api/sales/interest-categories` | **403** |

**Result: PASS**

---

## 13. Customer / Account Results

| Check | Result | Classification |
|---|---|---|
| List loads with meaningful fields | **PASS** | `id`, `email`, `displayName`, `role`, `organisation`, `interestAreas`, `logoUrl`, `catalogUrl`, phones |
| Detail loads with teammates | **PASS** | `teammates[]` when org has multiple users |
| Malformed ID `not-a-uuid` | **404** | Correct |
| Nonexistent UUID | **404** | Correct |
| False-success `200 {}` on known account | **0** | — |
| Duplicate rows from joins | Not observed in sample of 50 | — |
| Internal staff as customer | **404** (unit test + service policy) | Hides admin users |

**Customer / Account DTOs: PASS**

---

## 14. Lead / Opportunity Results

No lead or opportunity entities, routes, or UI components exist in the current Sales Control module. Supplier dashboard has an unrelated `OpportunityCenter` widget for supplier RFQ opportunities — **not** Sales Control CRM.

**Lead / Opportunity DTOs: NOT APPLICABLE**

---

## 15. RFQ / Sourcing Handoff

| Path | Status | Notes |
|---|---|---|
| `/sales/rfq` → `RfqListPage` | **MOUNTED** | Uses shared `useRfqList` / `rfqApi` |
| Admin can list RFQs | `GET /api/rfq?limit=3` → **200** | Canonical RFQ module |
| Navigation from Sales Control nav | "Customer RFQs" link present | No broken IDs on list load |

No automatic RFQ creation from Sales Control customer list navigation. Full RFQ flow not executed (per scope).

**Sales → RFQ / Sourcing Handoff: PASS**

---

## 16. PO / Order Context

Sales Control dashboard does **not** embed PO links directly. Related oversight surfaces:

| Surface | Route | Status |
|---|---|---|
| Import Control Tower | `/sales/control-tower` | Mounted — trade pipeline widgets |
| Shipments portfolio | `/shipments/portfolio` | In `SALES_CONTROL_NAV_GROUPS` |
| RFQ list | `/sales/rfq` | May show `PO_ISSUED` state badges |

Canonical entities (`PurchaseOrder`, `Workspace(ORDER)`, `Shipment`) remain authoritative. No duplicate order concepts introduced by Sales Control.

**Sales → PO / Order Context: NOT APPLICABLE** (no direct PO references in Sales Control module; oversight via shared surfaces)

---

## 17. Upload / Asset Results

| Check | Result |
|---|---|
| Upload routes exist | **YES** — logo + catalog on `/api/sales/customers/:id/*` |
| `uploadLimiter` applied | **YES** — `sales-control.routes.ts` lines 56, 65 |
| Malformed upload (no file) | **400 `FILE_REQUIRED`** — not 5xx |
| Buyer upload attempt | **403 `FORBIDDEN`** |
| File type validation | **Implemented** — images for logo, PDF for catalog (service + multer guard) |
| Storage keys not exposed in DTO | **PASS** — DTO returns API serving URLs only |
| Asset belongs to correct org on upload | **PASS** — `orgIdOf(customerId)` scopes writes |

**Upload / Asset Surface: PASS** (Sales Control upload path)  
**Asset delivery IDOR: see §29 P1-001**

---

## 18. Activity / Messaging

Sales Control account creation triggers:

- Phone verification request + admin notification
- Welcome email/WhatsApp templates

No unified messaging threads, internal notes, or activity timeline in Sales Control module.

**Activity / Messaging: NOT APPLICABLE**

---

## 19. Empty-State Results

No dedicated empty-org fixture tested in UI. API legitimately returns populated list (50 accounts). Service handles empty interest categories (returns `[]`). Frontend uses standard loading/error states in `SalesControlDashboardPage`.

**Valid Empty States: PASS** (by code review; populated production fixture prevents live empty-list UI test)

---

## 20. Populated-State Results

| Surface | Result |
|---|---|
| Customer list (50 rows) | Meaningful names, emails, roles, orgs |
| Customer detail | Teammates, phones, branding URLs |
| Search `q=acme` | 5 filtered results |
| Admin UI dashboard | Renders populated list after load |

**Known Populated State: PASS**

---

## 21. Invalid-ID / False-Success Results

| Case | Endpoint | Status | Classification |
|---|---|---|---|
| Malformed ID | `GET /sales/customers/not-a-uuid` | 404 | PASS |
| Nonexistent UUID | `GET /sales/customers/00000000-...-0099` | 404 | PASS |
| External role on internal route | `GET /sales/customers` as buyer | 403 | PASS (not false-success) |
| Known populated account | `GET /sales/customers/:id` | 200 with full DTO | PASS |

**False-Success 200 Responses: 0**  
**Suspicious Empty DTOs: 0**

---

## 22. Sensitive Commercial Field Review

Scanned Sales Control list + detail DTOs and buyer-visible R4 PO/shipment payloads for:

`margin`, `buyRate`, `buy_rate`, `internalPrice`, `spread`, `commission`, `pipelineValue`, `cost`, `dealScore`, `probability`, `carrierCost`, `procurementCost`

**Result: None found in Sales Control DTOs or buyer R4 fixtures.**

**Internal Margin / Buy-Rate Leakage: NO**

---

## 23. Cross-Tenant Spot Check

| Vector | Result |
|---|---|
| Buyer → `GET /api/sales/customers` | **403** — no customer list leak |
| Buyer → `GET /api/sales/customers/:otherId` | **403** |
| Buyer → `GET /api/supplier-organisations/:otherOrgId/logo` (org with logo) | **200** — see P1-001 |
| Buyer → `GET /api/supplier-organisations/:otherOrgId/catalog` (org with catalog) | **200** — 13.8 MB PDF streamed |

**Sales API cross-tenant customer data leakage to external roles: NO**  
**Supplier branding asset cross-tenant access: YES** (authenticated IDOR by org UUID)

---

## 24. Turkey Pilot Non-Interference

Read-only smoke on R4 fixtures as `buyer1@acme.test`:

| Route | Status |
|---|---|
| `GET /api/purchase-orders` | 200 |
| `GET /api/purchase-orders/32ce9003-af7e-438e-aa21-0848c8e338c1` (R4 PO) | 200 |
| `GET /api/products/b5748ad0-ba1d-4c7f-9402-3352c41ba606` (R4 product) | 200 |
| `GET /api/shipments/9f1c326a-97ad-4937-a200-09e628251070` (R4 shipment) | 200 |

Sales Control does not auto-create `CustomsCase`, `DutyTax`, or `InlandDelivery` on account existence (no such code paths).

**Turkey Pilot Non-Interference: PASS**

---

## 25. International Protected Flow

Read-only admin spot-check:

| Route | Status |
|---|---|
| `GET /api/rfq?limit=3` | 200 |
| `GET /api/commoditybid?limit=3` | 200 |

No stale Sales Control links to retired international screens found.

**International Protected Flow: PASS**

---

## 26. Browser / Network Errors

| Check | Result |
|---|---|
| Admin login → `/sales/dashboard` | Page loads; customer list renders |
| Console/pageerror during Sales Control visit | **0 unexplained errors captured** (no page crash) |
| Stale API 404 from Sales Control components | **0** |
| Expected 403 on external role API denial | Observed as designed |

**Unexplained Browser Page Errors: 0**

---

## 27. Existing Test Results

| Suite | Result |
|---|---|
| `apps/backend/src/modules/sales-control/sales-control.service.test.ts` | **8 / 8 PASS** |
| `packages/contracts/src/sales-control.test.ts` | **2 / 2 PASS** |

No additional Sales Control E2E spec files found. Phase 11 full build suite already passed; not re-run in full per Phase 5 scope.

---

## 28. Production Health

| Check | Before | After |
|---|---|---|
| `/api/healthz` | `status: ok` | `status: ok` |
| `/api/ready` | `ready: true`, all checks up | `ready: true`, all checks up |

---

## 29. P0 / P1 / P2 Findings

### P0 — None

### P1-001 — Supplier branding asset IDOR

| Field | Value |
|---|---|
| **Severity** | P1 |
| **Surface** | `GET /api/supplier-organisations/:orgId/logo` and `/catalog` |
| **Evidence** | `buyer1@acme.test` fetched unrelated org logo (`200`, 158 KB webp) and catalog (`200`, 13.8 MB PDF) using only org UUID |
| **Root cause** | `requireAuth` only — no org membership, role, or RFQ relationship check in `supplier-organisation.controller.ts` |
| **Impact** | Any authenticated user who knows/obtains another supplier org UUID can download branding assets uploaded via Sales Control. Not internal margin data; supplier marketing materials. |
| **User-visible** | Low direct UX impact; latent data exposure |
| **Remediation** | Scope asset GET to org members, assigned RFQ participants, or internal roles — smallest authz patch on supplier-organisation routes |
| **Phase 5 action** | Documented only — no code change per sprint policy |

### P2 — None observed in Sales Control scope

---

## 30. Dead Code Audit

| Item | Classification |
|---|---|
| `features/sales-control/*` | **MOUNTED** |
| Lead/Opportunity CRM in sales-control | **NOT PRESENT** |
| `/admin/users` legacy route | **Redirect** to `/sales/dashboard` |
| `/sales/whatsapp` | **Redirect** to unified messages |
| Workspace Academy `/sales/*` guides | **MOUNTED** (Phase 4 stub context — out of scope) |

---

## 31. Final Scorecard

```
PHASE 5 — SALES CONTROL REGRESSION

Sales Control Internal Surface:
PASS

Customer / Account DTOs:
PASS

Lead / Opportunity DTOs:
NOT APPLICABLE

Sales → RFQ / Sourcing Handoff:
PASS

Sales → PO / Order Context:
NOT APPLICABLE

Sales Upload / Asset Surface:
PASS

Activity / Messaging:
NOT APPLICABLE

Admin/Internal Sales Access:
PASS

Buyer Access Boundary:
PASS

Supplier Access Boundary:
PASS

Customs Broker Access Boundary:
PASS

Trucker Access Boundary:
PASS

Origin Agent Access Boundary:
PASS

Valid Empty States:
PASS

Known Populated State:
PASS

False-Success 200 Responses:
0

Suspicious Empty DTOs:
0

Internal Margin / Buy-Rate Leakage:
NO

Cross-Tenant Leakage:
NO

Upload / Asset Leakage:
YES

Turkey Pilot Non-Interference:
PASS

International Protected Flow:
PASS

Unexpected Sales-Control 5xx:
0

Unexpected Total 5xx:
0

Unexplained Browser Page Errors:
0

P0 Open:
0

P1 Open:
1

P2 Open:
0

PHASE 5 VERDICT:

PASS WITH DOCUMENTED NON-BLOCKING FRICTION
```

---

## 32. Pass Gate Assessment

| Gate | Met? | Notes |
|---|---|---|
| Internal role can access mounted surfaces | ✅ | Admin verified live |
| External roles cannot access internal Sales Control data | ✅ | 403 on all `/api/sales/*` |
| Internal margin/buy-rate leakage = NO | ✅ | |
| Cross-tenant customer/account leakage = NO | ✅ | Sales API blocked for external roles |
| Upload/asset leakage = NO | ⚠️ | **P1-001** — supplier branding IDOR on delivery endpoints |
| Known populated state meaningful | ✅ | |
| Valid empty state safe | ✅ | By implementation |
| False-success 200 on critical surfaces = 0 | ✅ | |
| Turkey + international flows operational | ✅ | |
| Unexpected critical 5xx = 0 | ✅ | |
| P0 = 0 | ✅ | |

**Rationale for PASS WITH FRICTION:** P1-001 is a pre-existing supplier-asset delivery scoping gap, not a Sales Control logic regression. It does not expose internal commercial fields, does not break pilot routes, and requires authenticated access with org UUID knowledge. Tracked for hardening; does not block controlled paid pilot under current GO decision.

---

## 33. After Phase 5

- **DO NOT START SPRINT 43**
- **Next validation:** Phase 14 — Minimum Production Monitoring Validation
- Then: Phase 16 — UI / I18N Launch Hygiene
- Then: Final pre-customer smoke → Customer #1

---

*Phase 5 complete. Validate. Document. Stop.*
