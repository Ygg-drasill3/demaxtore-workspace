# Phase 17B — Broker CustomsCase Navigation Blocker Remediation

Type: LAUNCH BLOCKER REMEDIATION (not Sprint 43)
Priority: P0
Date: 2026-08-14

This phase connects **existing assignment → existing CustomsCase → existing Broker Execution UI**.
It does not declare READY FOR CONTROLLED PAID PILOT.

---

## 1. R2 blocker evidence

Phase 17 R2 fixture (untouched history): `MVP-UI17-R2-20260814-JHYO`

R2 completed UI-only through Shipment → Customs, then stopped.

Observed blocker: Broker Smoke could open Partner Workspace and the assigned shipment, but could **not** navigate to the assigned CustomsCase without knowing the CustomsCase UUID.

No API bypass, no UUID entry, no assisted continuation.

R2 therefore ended:

- Broker Assignment: DEAD END
- Broker Execution: DEAD END

Downstream stages (Duty & Tax, CLEARED, Inland, Trucker, POD, True Landed Cost) were **NOT REACHED** because of this upstream navigation blocker. They are not independent defects from R2.

R2: P0 Open = 1. Controlled Paid Pilot: NOT READY.

---

## 2. Audit before coding

Inspected Sprint 35 Partner Workspace, Sprint 37 Turkish Customs Control Center, Sprint 38 Pre-Arrival, Sprint 39 Broker Execution 2.0.

### Audit answers

| # | Question | Answer |
|---|---|---|
| 1 | Does "My Customs Cases" already exist? | **Backend yes, UI no.** `PartnerWorkspaceService.home()` already builds `customsCases` for `CUSTOMS_BROKER` (assignment-scoped). Sidebar label "Customs Cases" exists but points at `/partner` (home). Home never renders `data.customsCases`. There is no `/partner/customs` list route. |
| 2 | Why was the R2 case not discoverable/openable? | Broker landed on Partner Home / My transactions. Transaction detail has no Open Customs Case. Sidebar "Customs Cases" is a home link, not a queue. The only working Open Customs Case control lives on **Admin** `ShipmentWorkspacePage` (`TurkeyCustomsPanel`). Brokers never use that page. |
| 3 | Does the broker home DTO contain `customsCaseId`? | **Yes.** `PartnerCustomsCaseSummaryDto.customsCaseId`. |
| 4 | Does it contain `shipmentId` but not `customsCaseId`? | **No.** It contains both `customsCaseId` and `shipmentWorkspaceId`, plus `shipmentRef`, status, ETA, readiness, nextAction, queueGroup. |
| 5 | Is the case returned but link missing? | **Yes.** DTO is populated; Partner Home never links it. |
| 6 | Is the link generated incorrectly? | On Admin shipment workspace, `TurkeyCustomsPanel` already generates `/partner/customs/${caseId}` for brokers. That link is not shown in Partner Workspace. Sidebar `to: "/partner"` is the wrong destination. |
| 7 | Is the route missing? | **List route missing.** Detail route **exists**: `/partner/customs/:id` → `CustomsCasePage`, `RequireRole allow={["CUSTOMS_BROKER","ADMIN","SUPER_ADMIN"]}`. |
| 8 | Is the route buyer-only? | Detail partner route is broker/admin. Buyer list `/buyer/customs` is BUYER-only (`GET /customs/cases` also denies brokers). Do not expose buyer list to brokers. |
| 9 | Is the case detail component already reusable? | **Yes.** Same `CustomsCasePage` is used for `/buyer/customs/:id` and `/partner/customs/:id`. Broker execution actions already render when `allowedActions` includes them. |
| 10 | Is PartnerAssignment correctly associated? | **Yes.** Assignment is on the **shipment workspace**. `syncPartnerSideEffects` stamps `brokerUserId` / `brokerAssignmentId` on the existing CustomsCase. Unique `(workspaceId, userId, partnerRole)`. |
| 11 | Assignment scoped to shipment while navigation expects case assignment? | Assignment is shipment-scoped by design. Home query: `customsCase.shipmentWorkspaceId in assigned SHIPMENT ids`. Access: active `PartnerAssignment` on `caseRow.shipmentWorkspaceId`. Not a resolution gap. |
| 12 | Does the broker have authorization after opening the correct route? | **Yes, if assigned.** `assertCustomsCaseAccess` requires active CUSTOMS_BROKER assignment. Unassigned / revoked → 403 `PARTNER_NOT_ASSIGNED`. Origin Agent / Trucker → `CUSTOMS_FORBIDDEN`. |

### Root cause classification

Primary:

- **EXISTS_BUT_UNROUTED** — assigned cases are in the home DTO; no Partner Workspace list surface / sidebar destination.
- **EXISTS_BUT_NOT_LINKED** — Partner Home and Partner Transaction Detail do not link to `/partner/customs/:id`.
- **UI_DISCOVERABILITY_GAP** — broker can open the shipment but not the CustomsCase execution surface.

Secondary (transaction detail only):

- **DTO_MISSING_NAVIGATION_CONTEXT** — `PartnerTransactionDetailDto` has no `customsCaseId`. Eligibility API already returns it for assigned brokers; UI does not call it.

Not primary:

- ROUTE_PERMISSION_MISMATCH — `/partner/customs/:id` already allows CUSTOMS_BROKER.
- ASSIGNMENT_RESOLUTION_GAP — assignment and case access already share shipment workspace scope.

### Existing architecture reused (no new entities)

- PartnerWorkspace / PartnerAssignment / Partner home DTO `customsCases`
- CustomsCase + Sprint 39 `CustomsCasePage` + `createCustomsBrokerService`
- Route `/partner/customs/:id`
- `assertCustomsCaseAccess` assignment gate
- Admin `ShipmentPartnersPanel` assign + existing `POST /partner/assignments/:id/revoke`
- `TurkeyCustomsPanel` / `customsApi.eligibility` for shipment → case continuity

### What will not be created

- Second CustomsCase / BrokerCase / PartnerCustomsCase
- New broker portal or PartnerAssignment model
- Org-wide broker `GET /customs/cases`
- Duplicate execution pipeline

---

## 3. Root cause

Assigned CustomsCases were already returned on the Partner Workspace home DTO and the broker execution route already existed; Partner Workspace never rendered or linked that queue, so the broker could not open the case without a UUID.

---

## 4. Existing architecture reused

See §2. Implementation is CONNECT only.

---

## 5. Files changed

Connect-only. No new CustomsCase, BrokerCase, PartnerAssignment model, or broker portal.

### Frontend

- `apps/frontend/src/features/partner-workspace/components/MyCustomsCasesQueue.tsx` — assignment queue; human-readable title; **Open Case** → `/partner/customs/:id`; empty state
- `apps/frontend/src/features/partner-workspace/components/MyCustomsCasesQueue.test.tsx`
- `apps/frontend/src/features/partner-workspace/pages/PartnerCustomsCasesPage.tsx` — thin list at `/partner/customs` using `partnerApi.home().customsCases` (not buyer `GET /customs/cases`)
- `apps/frontend/src/features/partner-workspace/pages/PartnerHomePage.tsx` — renders queue when `data.customsCases !== undefined`
- `apps/frontend/src/features/partner-workspace/pages/PartnerHomePage.test.tsx`
- `apps/frontend/src/features/partner-workspace/components/PartnerShipmentCustomsLink.tsx` — secondary shipment → case path (CUSTOMS_BROKER only, eligibility API)
- `apps/frontend/src/features/partner-workspace/components/PartnerShipmentCustomsLink.test.tsx`
- `apps/frontend/src/features/partner-workspace/pages/PartnerTransactionDetailPage.tsx` — mounts shipment customs link
- `apps/frontend/src/features/partner-workspace/components/ShipmentPartnersPanel.tsx` — **Revoke** on existing assignment (Admin/Ops)
- `apps/frontend/src/features/partner-workspace/lib/partner.api.ts` — `revoke(assignmentId)`
- `apps/frontend/src/routes/index.tsx` — `/partner/customs` CUSTOMS_BROKER-only; `/partner/customs/:id` unchanged (broker+admin)
- `apps/frontend/src/routes/navigation.ts` — broker: **My Work** `/partner` (`end: true`), **My Customs Cases** `/partner/customs`
- `apps/frontend/src/routes/navigation.partner-customs.test.ts`
- `apps/frontend/src/routes/guards/__tests__/RequireRole.test.tsx` — Origin Agent / Trucker denied list route
- `apps/frontend/src/features/customs/pages/CustomsCasePage.tsx` — broker Back → `/partner/customs`

### Backend

- `apps/backend/src/modules/partner-workspace/partner-workspace.service.ts` — `importerLabel` = `poRef ?? orderRef`; revoke CUSTOMS_BROKER clears `customsCase.brokerUserId` / `brokerAssignmentId`
- `apps/backend/src/modules/partner-workspace/partner-workspace.service.test.ts` — home queue, empty state, Origin Agent omission, revoke
- `apps/backend/src/modules/customs/customs.policy.test.ts` — assignment gate
- `apps/backend/src/security/tenant-isolation.test.ts` — trucker denied case GET; broker denied org-wide list

### Contracts

- `packages/contracts/src/customs-broker-execution.test.ts` (Sprint 39 allowed-actions, no semantic change)

Access policy (`assertCustomsCaseAccess`) unchanged. Brokers still cannot `GET /customs/cases`.

---

## 6. Partner Workspace navigation behavior

After CUSTOMS_BROKER login:

1. Partner home `/partner` shows **My Customs Cases** when the home DTO includes `customsCases`.
2. Sidebar **My Customs Cases** goes to `/partner/customs` (no longer a home alias).
3. **My Work** remains `/partner` with `end: true` so it is not highlighted for every `/partner/*` child.
4. Each row **Open Case** navigates to existing `/partner/customs/:customsCaseId`. UUID is only in the href; the visible title is `shipmentRef` (fallback `importerLabel`).
5. Secondary path: assigned broker opening an assigned shipment transaction sees **Open Customs Case** via eligibility (not Admin `ShipmentWorkspacePage`).

ORIGIN_AGENT and TRUCKER do not receive `customsCases` on home and do not get the customs sidebar item. Trucker live: home **My Deliveries** only; `/partner/customs` and `/partner/customs/:id` redirect to `/partner`.

---

## 7. My Customs Cases behavior

Queue source is existing `GET /partner/home` `customsCases` (assignment-scoped, CUSTOMS_BROKER only).

Displayed (already on DTO): shipment reference, status, importer/PO label, destination, ETA / days-to-arrival, readiness, urgency, next action. Group labels reuse Sprint 39 `queueGroup`.

Empty: `No assigned customs cases yet.` — no fabricated rows, no 404, no infinite load.

Live (Broker Smoke, 2026-08-14): queue visible with human-readable refs (JHYO DRAFT among others). After revoke of MSPYZYSJ, that case disappeared from home and from `/partner/customs` (8 remaining assigned cases; revoked id absent).

---

## 8. Route decision

Reuse existing **`/partner/customs/:id`** → `CustomsCasePage` (Sprint 39 execution surface).

Add thinnest broker-only list **`/partner/customs`** wrapping the same home DTO queue. Do **not** expose buyer `/buyer/customs` or `GET /customs/cases` to brokers.

Admin/Ops still use `TurkeyCustomsPanel` **Open Customs Case** on shipment workspace. Brokers use Partner Workspace.

---

## 9. Authorization model

Unchanged assignment-based access:

- Active `PartnerAssignment` (`partnerRole=CUSTOMS_BROKER`, `revokedAt=null`) on the case's shipment workspace
- CustomsCase belongs to that shipment
- Role permits broker customs execution

Denied (403): unassigned broker, revoked assignment, trucker, origin agent, org-wide list. No CUSTOMS_BROKER → all cases.

Server remains authoritative. Frontend hiding is not the control.

---

## 10. Revocation behavior

Admin/Ops **Revoke** on `ShipmentPartnersPanel` calls existing `POST /partner/assignments/:id/revoke`.

After revoke of CUSTOMS_BROKER:

- denormalized `brokerUserId` / `brokerAssignmentId` cleared on the case
- case leaves My Customs Cases
- `GET /customs/cases/:id` → 403 `PARTNER_NOT_ASSIGNED`
- mutations (e.g. `POST .../request-document`) → 403 `PARTNER_NOT_ASSIGNED`
- deep-link UI: `Failed to load customs case` — no execution controls

Live: shipment `a2f50969-e394-47cf-9c81-0b73d5c8e103` (`SHP-ORD-DIR-PO-MSPYZYSJ-0C677CD7`) broker revoked via UI. Trucker assignment left intact. JHYO assignment untouched.

---

## 11. Live UI smoke

Environment: `https://workspace.demaxtore.com`

Marker: **`MVP-UI17B-20260814-MK29`** (not JHYO / Q4M2 / K7R3)

R2 fixture `MVP-UI17-R2-20260814-JHYO` was **not mutated**.

A brand-new Product→PO chain was not completed in this session. Smoke used existing assigned Turkey case **MSPYZYSJ** (not prior-phase evidence). Assignment already existed; navigation + revoke were exercised through supported UI. Marker recorded on a safe **Request document** reason (case already `BROKER_REVIEW`, so Start Review was not available without mutating JHYO DRAFT).

| Step | Result |
|---|---|
| Broker login → Partner Workspace | PASS — My Work + My Customs Cases |
| Find case by human-readable context | PASS — shipment refs, not UUID titles |
| Open Case click | PASS — `/partner/customs/23a0cf35-f300-4ef2-8709-1309f2faf9e5` |
| Broker Execution surface | PASS — Start declaration preparation, Request document/information, Verify classification, Place hold, Duty/Tax (existing Sprint 39) |
| Safe non-terminal action | PASS — Request document PACKING_LIST; Activity `DOCUMENT REQUESTED · CUSTOMS BROKER · 14.08.2026 13:52:51` |
| Refresh persistence | PASS — still BROKER REVIEW; today's event present; actions still listed |
| Opening does not mutate by view | PASS — view/refresh did not create duplicate case/assignment |
| Revoke via Admin Partners panel | PASS — Customs Broker **Not assigned**; trucker still assigned |
| Case absent after broker relogin | PASS — MSPYZYSJ not in home or `/partner/customs` |
| Deep-link denied | PASS — UI error; GET 403; POST request-document 403 `PARTNER_NOT_ASSIGNED` |
| Trucker home | PASS — My Deliveries; no My Customs Cases; home DTO has no `customsCases` |
| Trucker `/partner/customs` and case deep-link | PASS — redirected to `/partner`; APIs 403 |
| Origin Agent live login | Not available (no seeded user). Unit/frontend PASS |

No API shortcut for navigation. No UUID typed by the tester. UUID appeared only inside generated hrefs.

---

## 12. Security regression

| Check | Result |
|---|---|
| Assigned broker + assigned case | 200 / execution UI |
| Same broker + revoked/unassigned case | 403 `PARTNER_NOT_ASSIGNED` |
| Broker org-wide `GET /customs/cases` | 403 (tenant-isolation) |
| Trucker case GET / duty-tax / list | 403 |
| Origin Agent list route | RequireRole bounce (frontend test); home omits `customsCases` (backend test) |
| Cross-tenant isolation | `tenant-isolation.test.ts` **17/17 PASS** |
| Document isolation | Prior shipment document isolation remains; no 17B broadening of document APIs |
| Internal margin | Home DTO strip list includes `margin` / `internalMargin`; broker home test asserts no `margin` |

---

## 13. Sprint 39 regression

Existing execution surface reached; allowed-actions contract unchanged.

- `packages/contracts/src/customs-broker-execution.test.ts` — 3 PASS
- `apps/backend/src/modules/customs/*.test.ts` — 15 PASS (policy, duty-tax)
- `partner-workspace.service.test.ts` — 10 PASS
- Frontend partner customs/nav/role tests — 19 PASS

No Sprint 39 lifecycle rewrite. CLEARED / Duty completion not in 17B scope.

---

## 14. Browser / network errors

17B broker execution / revoke window (after backend ready): **unexpected 5xx = 0**.

Expected 403s on revoked/unassigned/trucker customs APIs.

Four nginx **502**s at `14/Aug/2026:10:00:50Z` occurred during an earlier `pm2 restart` (`EADDRINUSE` retry), before the broker Request document / revoke smoke. Not counted as 17B product 5xx.

No blank Partner home, no loading loop, no broken `/partner/customs` list for the assigned broker.

---

## 15. Remaining findings

**ROOT BLOCKER (R2):** Broker CustomsCase Navigation — **CLOSED**.

**NOT REACHED DOWNSTREAM (R2, not independent 17B defects):** Broker Execution completion, Duty & Tax, CLEARED, Inland, Trucker, POD, True Landed Cost. These wait for Phase 17 R3.

P0: 0  
P1: 0  

P2:

1. Live 17B used existing assigned Turkey case MSPYZYSJ rather than a brand-new Product→PO disposable chain. Navigation P0 still proven; JHYO/Q4M2/K7R3 untouched.
2. No seeded Origin Agent smoke user — live OA login not performed; tests cover omission/deny.
3. After required revoke proof, MSPYZYSJ broker assignment remains revoked (optional reassign not performed). JHYO still assigned.
4. Shipment Participants still listed `OPERATOR : Broker Smoke` after revoke while Partners panel showed **Not assigned**. Pre-existing participant denormalization; assignment gate is what authorization uses.

---

## 16. Phase 17 R3 readiness

Phase 17B is remediation only. It does **not** declare READY FOR CONTROLLED PAID PILOT.

Navigation P0 is closed. R3 must start a **fresh** Golden Path:

`MVP-UI17-R3-<date>-<random>`

Do not reuse K7R3, Q4M2, JHYO, or MK29.

R3 starts again from Product and must prove the full chain through True Landed Cost / Final Buyer View.

**PHASE 17 R3 READY: YES**

---

## 17. Final summary

PHASE 17B — BROKER CUSTOMSCASE NAVIGATION BLOCKER REMEDIATION

Root Cause:
Assigned CustomsCases were already on the Partner Workspace home DTO and `/partner/customs/:id` already existed; Partner Workspace never rendered or linked that queue.

My Customs Cases Queue:
PASS

Assigned Case Discoverable:
PASS

Assigned Case Clickable:
PASS

Manual UUID Required:
NO

Direct API Required:
NO

Broker Execution Surface Reachable:
PASS

Safe Broker Action Through UI:
PASS

Refresh Persistence:
PASS

Unassigned Case Access:
PASS

Revoked Assignment Access:
PASS

Cross-Tenant Isolation:
PASS

Document Isolation:
PASS

Origin Agent Regression:
PASS

Trucker Regression:
PASS

Sprint 39 Regression:
PASS

Internal Margin Protection:
PASS

Unexpected 5xx:
0

P0 Open:
0

P1 Open:
0

P2 Open:
4

PHASE 17 R3 READY:
YES
