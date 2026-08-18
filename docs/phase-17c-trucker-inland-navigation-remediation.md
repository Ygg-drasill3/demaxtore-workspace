# Phase 17C — Trucker Inland Delivery Navigation Blocker Remediation

Type: LAUNCH BLOCKER REMEDIATION (not Sprint 43)
Priority: P0
Date: 2026-08-14

This phase connects **existing assignment → existing InlandDelivery → existing Trucker execution UI**.
It does not declare READY FOR CONTROLLED PAID PILOT.

---

## 1. R3 blocker evidence

Phase 17 R3 fixture (untouched history): `MVP-UI17-R3-20260814-W4JF`

R3 completed UI-only through CLEARED → Inland request → Trucker assignment, then stopped.

Observed blocker: Trucker Smoke could log in to Partner Workspace, but could **not** discover/open the assigned InlandDelivery execution page without knowing the InlandDelivery UUID.

Evidence from R3:

- Sidebar **My Deliveries** pointed at `/partner` (home), not an inland queue.
- Partner home did not render `data.inlandDeliveries`.
- Action required: empty.
- Home My transactions truncated to 8 and omitted the fresh R3 shipment.
- View all showed the R3 **shipment** (`BOOKING_CONFIRMED`). Opening it showed partner transaction detail with no inland actions.
- Notifications had no R3 inland assignment.
- Existing route `/partner/inland/:id` and page `InlandDeliveryPage` were never linked from Partner Workspace.

No API bypass, no UUID entry, no assisted continuation.

R3 therefore ended:

- Trucker Case Discovery: **DEAD END** (ROOT BLOCKER)
- Trucker Execution / POD / True Landed Cost / Final Buyer View: **NOT REACHED** (not independent defects)

R3: P0 Open = 1. Controlled Paid Pilot: NOT READY.

R3 entities left unmodified by 17C mutating smoke:

- Product SKU `FLOUR-UI17R3-W4JF`
- PO `PO-MSSUNRZ1-025FDCD1`
- Shipment `SHP-ORD-DIR-PO-MSSUNRZ1-025FDCD1-025FDCD1`
- Container `MSKU17R3W4JF`
- InlandDelivery remained **TRUCKER ASSIGNED** / POD PENDING (opened read-only; Schedule pickup not clicked)

---

## 2. Audit before coding

Inspected Sprint 35 Partner Workspace, Sprint 41 Turkey Inland Execution V1, Phase 17B My Customs Cases pattern.

### Audit answers

| # | Question | Answer |
|---|---|---|
| 1 | Does backend already return inlandDeliveries to TRUCKER? | **Yes.** `PartnerWorkspaceService.home()` builds `inlandDeliveries` only when `role === "TRUCKER"`, scoped to assigned SHIPMENT workspace ids **and** `truckerUserId: actor.id`, excluding `CANCELLED`. |
| 2 | What exact fields are present? | `inlandDeliveryId`, `shipmentWorkspaceId`, `shipmentRef`, `containerNumber`, `pickupLocation`, `deliveryCity`, `pickupAt`, `status`, `nextAction`, `queueGroup`. |
| 3 | Is InlandDelivery ID already included? | **Yes.** `inlandDeliveryId`. |
| 4 | Is shipment/container human-readable context included? | **Yes.** `shipmentRef` (referenceNumber ?? orderRef), `containerNumber`, `deliveryCity`, `pickupLocation`, `pickupAt`, `status`, `nextAction`. |
| 5 | Does a trucker delivery detail route already exist? | **Yes.** `/partner/inland/:id` → `InlandDeliveryPage`. |
| 6 | Is that route registered? | **Yes.** `RequireRole allow={["TRUCKER","ADMIN","SUPER_ADMIN","OPS_MANAGER"]}`. Buyer uses `/buyer/inland/:id`. |
| 7 | Is the route accessible to assigned TRUCKER? | **Yes, if they know the id.** GET `/api/inland/:id` uses `assertAccess`: active PartnerAssignment on the shipment + TRUCKER role. Unassigned/revoked → 403 `PARTNER_NOT_ASSIGNED`. Cost fields stripped (`showCost = access !== "TRUCKER"`). Schedule pickup is already allowed for assigned trucker. |
| 8 | Is Partner Workspace simply not rendering the queue? | **Yes.** `PartnerHomePage` renders `MyCustomsCasesQueue` when `customsCases !== undefined` and **never reads `inlandDeliveries`**. |
| 9 | Is a link missing? | **Yes.** No Open Delivery on Partner home. `InlandDeliveryPanel` Open Delivery (`/partner/inland/${id}` for TRUCKER) lives on **Admin/Buyer shipment workspace**, which the trucker does not use. Partner transaction detail has no inland link. |
| 10 | Is there a DTO gap? | **No for the queue.** Home DTO is sufficient. Secondary shipment path can use existing `GET /inland/by-shipment/:shipmentWorkspaceId` (already `managersAndTrucker`). |
| 11 | Is there a route permission mismatch? | **No** for detail. **List route missing:** there is no `/partner/inland` list (trucker `GET /inland` is explicitly 403 `INLAND_FORBIDDEN` — do not use buyer/org list). Sidebar “My Deliveries” is a home alias. |
| 12 | Is assignment scoped correctly? | **Yes.** Assignment is shipment-scoped. Home query: `inlandDelivery.shipmentWorkspaceId in assigned SHIPMENT ids` AND `truckerUserId = actor.id`. Access: active `PartnerAssignment` TRUCKER on `row.shipmentWorkspaceId`. Revoke already clears trucker pointer and rolls pre-pickup status back to REQUESTED. |

### Root cause classification

Primary:

- **EXISTS_BUT_NOT_RENDERED** — assigned deliveries are in the home DTO; Partner Home never renders them.
- **EXISTS_BUT_NOT_LINKED** — no Open Delivery to `/partner/inland/:id` from Partner Workspace.
- **UI_DISCOVERABILITY_GAP** — trucker can open the assigned shipment transaction but not the InlandDelivery execution surface.

Not primary:

- DTO_MISSING_NAVIGATION_CONTEXT — `PartnerInlandDeliverySummaryDto` already has `inlandDeliveryId` + human-readable refs.
- ROUTE_PERMISSION_MISMATCH — `/partner/inland/:id` already allows TRUCKER.
- ASSIGNMENT_RESOLUTION_GAP — assignment and inland access already share shipment workspace scope.

### Existing architecture reused (no new entities)

- PartnerWorkspace / PartnerAssignment / Partner home DTO `inlandDeliveries`
- InlandDelivery + Sprint 41 `InlandDeliveryPage` + `createInlandDeliveryService.assertAccess`
- Route `/partner/inland/:id`
- Admin `ShipmentPartnersPanel` assign + existing `POST /partner/assignments/:id/revoke`
- `InlandDeliveryPanel` / `inlandApi.byShipment` for shipment → delivery continuity
- Phase 17B queue pattern (`MyCustomsCasesQueue`)

### What will not be created

- Second InlandDelivery / TruckerDelivery / TruckShipment
- New trucker portal or PartnerAssignment model
- Org-wide trucker `GET /inland`
- Duplicate delivery lifecycle / POD / TLC

---

## 3. Root cause

Assigned InlandDeliveries were already returned on the Partner Workspace home DTO and the trucker execution route already existed; Partner Workspace never rendered or linked that queue, so the trucker could not open the delivery without a UUID.

---

## 4. Existing architecture reused

See §2. Implementation is CONNECT only. No second InlandDelivery, no Trucker portal, no new PartnerAssignment model.

---

## 5. Files changed

Frontend (queue + navigation):

- `apps/frontend/src/features/partner-workspace/components/MyDeliveriesQueue.tsx` (+ test)
- `apps/frontend/src/features/partner-workspace/pages/PartnerInlandDeliveriesPage.tsx`
- `apps/frontend/src/features/partner-workspace/pages/PartnerHomePage.tsx` (+ test)
- `apps/frontend/src/features/partner-workspace/components/PartnerShipmentInlandLink.tsx` (+ test)
- `apps/frontend/src/features/partner-workspace/pages/PartnerTransactionDetailPage.tsx`
- `apps/frontend/src/routes/index.tsx` — `/partner/inland` TRUCKER-only list registered **before** `/:id`
- `apps/frontend/src/routes/navigation.ts` — TRUCKER **My Work** `/partner` (`end: true`), **My Deliveries** `/partner/inland`
- `apps/frontend/src/routes/navigation.partner-customs.test.ts`
- `apps/frontend/src/routes/guards/__tests__/RequireRole.test.tsx`
- `apps/frontend/src/features/inland/pages/InlandDeliveryPage.tsx` — trucker Back → `/partner/inland`; hide Open Shipment and inland cost rows; `schedule-pickup` / `pickup-at-input` test ids

Backend (DTO already sufficient; thin allowedActions alignment + tests):

- `apps/backend/src/modules/inland/inland-delivery.service.ts` — assigned TRUCKER `allowedActions` includes `SCHEDULE_PICKUP` when status is `TRUCKER_ASSIGNED` or `PICKUP_SCHEDULED`
- `apps/backend/src/modules/inland/inland-delivery.service.test.ts`
- `apps/backend/src/modules/partner-workspace/partner-workspace.service.test.ts`
- `apps/backend/src/security/tenant-isolation.test.ts` — assigned trucker GET; org-wide list denied; random inland denied; broker denied trucker inland; trucker duty-tax denied; trucker landed-cost denied

No new InlandDelivery / TruckerDelivery / PartnerAssignment model. No org-wide `GET /inland` for trucker. No DTO payload expansion beyond existing home fields.

---

## 6. My Deliveries queue

Partner home renders `MyDeliveriesQueue` when `data.inlandDeliveries !== undefined` (TRUCKER only).

Sidebar **My Deliveries** → `/partner/inland` (assignment-scoped home DTO, not `GET /inland`).

Live (Trucker Smoke, 2026-08-14):

- Heading **My Deliveries** on Partner home
- Action required row identified by shipment ref `ORD-DIR-PO-MSSUNRZ1-025FDCD1-025FDCD1` (not UUID)
- Context: `TRUCKER ASSIGNED · MSKU17R3W4JF · Pickup Terminal / POD Istanbul · Istanbul · Next: Schedule pickup`
- **Open Delivery** present
- Empty state covered by unit test (`my-deliveries-empty`)

---

## 7. Delivery route / navigation

Canonical: `/partner/inland/:id` → existing `InlandDeliveryPage`.

Trucker clicked **Open Delivery** on the R3 row. Browser navigated to the existing execution surface. The href contains the inland id (normal SPA routing). The trucker did **not** type, copy, or paste a UUID.

Secondary path: `PartnerShipmentInlandLink` on partner transaction detail (TRUCKER only, via `inlandApi.byShipment`).

Trucker Back link → `/partner/inland`. Open Shipment hidden for TRUCKER (full shipment workspace is not a trucker-minimized surface).

---

## 8. Authorization

Server `assertAccess` unchanged:

| Actor | Result |
|---|---|
| Assigned TRUCKER + assigned delivery | ALLOWED (GET 200, Schedule pickup 200) |
| Same TRUCKER + revoked delivery | DENIED (GET 403, events 403, no mutation UI) |
| CUSTOMS_BROKER + `/partner/inland` list | frontend `RequireRole` bounce to `/partner` |
| CUSTOMS_BROKER + inland detail | frontend bounce to `/partner` |
| ORIGIN_AGENT + inland list | unit/RequireRole denied |
| Org-wide `GET /inland` as TRUCKER | 403 `INLAND_FORBIDDEN` (tenant-isolation test) |
| Random inland UUID as TRUCKER | denied (tenant-isolation test) |
| Buyer / Admin / Ops | existing behavior unchanged |

Revoke used Admin `ShipmentPartnersPanel` **Revoke** (`assign-trucker-revoke`). Historical activity (`OPERATOR: Trucker Smoke`) remained on the shipment.

---

## 9. Data minimization

Live trucker inland page (W4JF read-only + MSPYZYSJ execution) showed:

- Shipment ref, container, pickup location, destination, status, POD status, Sprint 41 actions

Did **not** show:

- Duty & Tax
- GTİP classification
- Inland cost / cost kind (hidden when `isTrucker`)
- FreightIQ buy rate
- DeMaxtore margin
- True Landed Cost
- Buyer-wide financials

`toDto` still nulls `inlandCostAmount/Currency/Kind` when `access === "TRUCKER"`. `RECORD_COST` remains non-trucker.

Tenant isolation: trucker `GET /api/customs/cases/:id/duty-tax` denied; trucker landed-cost list/detail denied.

---

## 10. Safe trucker action

Disposable mutating smoke (not W4JF):

- Marker note: `MVP-UI17C-20260814-K8P3`
- Human-readable job: `ORD-DIR-PO-MSPYZYSJ-0C677CD7-0C677CD7`
- Opened from **My Deliveries** (Upcoming pickups, status PICKUP SCHEDULED)
- UI action: **Schedule pickup** datetime `2026-08-18T09:00`
- `POST /api/inland/10797eae-c9cd-47b2-b83f-6a1c23ddd3b3/schedule-pickup` → **200**
- Pickup at updated to `8/18/2026, 9:00:00 AM`
- New activity event `PICKUP_SCHEDULED · 8/14/2026, 12:17:34 PM` (prior event retained; no duplicate InlandDelivery)
- Did **not** Mark Delivered

W4JF inland was opened to prove the R3 P0 path lands on Schedule pickup, then left without mutation.

---

## 11. Refresh persistence

After Schedule pickup, browser reload of the same supported route:

- Status remained `PICKUP SCHEDULED`
- Pickup remained `8/18/2026`
- Two `PICKUP_SCHEDULED` events (original + 17C smoke) — refresh did **not** add a third
- No duplicate InlandDelivery

---

## 12. Revoke behavior

Admin opened the shipment from inland **Open Shipment** (Admin-only link) and clicked **Revoke** on Trucker Smoke.

After trucker relogin:

- `ORD-DIR-PO-MSPYZYSJ-0C677CD7-0C677CD7` **gone** from My Deliveries
- W4JF row **still present** (assignment not revoked)
- Deep link `/partner/inland/10797eae-c9cd-47b2-b83f-6a1c23ddd3b3` → GET 403 + events 403
- UI: `Failed to load inland delivery.` — no Schedule pickup, no mutation controls
- Shipment history still showed `OPERATOR: Trucker Smoke`

---

## 13. Deep-link security

| Condition | Result |
|---|---|
| Assigned trucker refresh of MSPYZYSJ inland | allowed (200, state persisted) |
| Same trucker after revoke | 403, error UI, no actions |
| Broker navigating `/partner/inland` | redirected to `/partner` (My Customs Cases still present) |
| Broker navigating W4JF inland UUID | redirected to `/partner` |

Queue hiding is not the only control; GET is server-authorized.

---

## 14. Broker regression

After Partner Workspace changes:

- Broker Smoke login → Partner home **My Customs Cases** (no **My Deliveries** sidebar)
- W4JF case identifiable: `ORD-DIR-PO-MSSUNRZ1-025FDCD1-025FDCD1` · CLEARED · Open Case
- Opened `/partner/customs/6d5e2a91-1e79-453b-bacf-897731421dac` — status **CLEARED**, Duty & Tax / GTİP remain on the **broker** case (correct)
- `/partner/inland` and `/partner/inland/:id` bounce broker off trucker routes

---

## 15. Origin Agent regression

No live `origin.smoke` seed user. Covered by:

- `PartnerHomePage` test: origin payload hides My Deliveries and My Customs Cases
- `NAV_BY_ROLE.ORIGIN_AGENT` has no `/partner/inland`
- `RequireRole` test: ORIGIN_AGENT denied `/partner/inland` list
- Partner home service: ORIGIN_AGENT `inlandDeliveries` is undefined

---

## 16. Tenant isolation regression

`apps/backend/src/security/tenant-isolation.test.ts` plus partner inland unit tests:

- Assigned trucker GET inland from home queue: allowed
- Trucker org-wide inland list: denied
- Random inland id: denied
- Broker inland GET of trucker delivery: denied
- Trucker duty-tax: denied
- Trucker landed-cost: denied
- Cross-tenant shipment/document/landed-cost assertions unchanged (no weakening)

---

## 17. Browser / network evidence

Trucker session (login → My Deliveries → Open Delivery → Schedule pickup → refresh):

- Console errors: 0 on successful execution pages
- Unexpected **5xx: 0**
- Expected 403 after revoke (inland GET + events) — not counted as unexpected
- Login / partner home / inland GET / schedule-pickup: 200
- No blank page, no loading loop on assigned delivery
- Console warnings: pre-existing motion keyframe blur (not 17C)

Broker Open Case: 200, CLEARED case rendered.

---

## 18. Remaining findings

**ROOT BLOCKER FROM R3:** Trucker Case Discovery — **CLOSED**.

**NOT INDEPENDENTLY PROVEN BROKEN (still R4):** Trucker Execution through Delivered, POD, True Landed Cost, Final Buyer View.

P2 (non-blocking):

- Live Origin Agent UI smoke not run (no origin.smoke identity); unit/nav coverage only.
- Revoked deep-link UI copy is generic (`Failed to load inland delivery`) rather than an explicit “assignment revoked” message. Access is still denied server-side.
- 17C mutating smoke used an existing CLEARED inland (`MSPYZYSJ`) plus marker note `MVP-UI17C-20260814-K8P3` rather than a full Product→CLEARED new transaction. R3 `W4JF` was not mutated.

---

## 19. Phase 17 R4 readiness

Phase 17C exit criteria for the navigation seam are met.

**PHASE 17 R4 READY: YES**

Do **not** declare READY FOR CONTROLLED PAID PILOT.

Next: PHASE 17 R4 — FRESH TURKEY IMPORTER UI-ONLY GOLDEN PATH with marker `MVP-UI17-R4-<date>-<random>`. Do not reuse K7R3, Q4M2, JHYO, W4JF, 17B fixture, or 17C/MSPYZYSJ.

---

## Can a trucker with only username, password, and Partner Workspace find and open the assigned delivery?

**YES.**
