# DeMaxtore Workspace — Multi-Role UX Audit & Redesign

**Base branch:** `turkey-importer-ux-redesign` → **new branch:** `workspace-multirole-ux-redesign`
**Nature:** presentation/IA redesign. No backend, Prisma, auth, tenancy, or engine changes. All capabilities preserved (hide ≠ delete).
**Verification:** the Node/Vite/Prisma app can't be built in this sandbox → runtime/build/E2E are **UNVERIFIED**. Static validation only.

> Objective met at the IA layer: each role now sees a role-appropriate surface instead of a shared "everything" menu. The largest defect fixed: **Ops execution roles no longer inherit the ~29-item Admin control surface** — they get a focused execution surface.

---

## 1. Roles audited (all active roles in `NAV_GROUPS_BY_ROLE`)
Admin, Super Admin, OPS_MANAGER, LOGISTICS_OPERATOR, FINANCE_OPERATOR, DOCUMENT_CONTROLLER (DeMaxtore Ops), Sales Control, Turkey Importer Buyer, International Buyer, Supplier, CUSTOMS_BROKER (Broker), TRUCKER, ORIGIN_AGENT, FORWARDER.

## 2. Per-role findings & disposition
| Role | Before | Finding | Disposition |
|---|---|---|---|
| **Admin / Super Admin** | 4 groups, **~29 items** (operations=11, workspaces=13) | Two giant buckets; hard to scan; freight/containers/insights mixed | **REDESIGN** → 7 themed groups (≤6 items each), all 29 routes/testIds preserved |
| **DeMaxtore Ops** (OPS_MANAGER, LOGISTICS_OPERATOR, FINANCE_OPERATOR, DOCUMENT_CONTROLLER) | inherited full **ADMIN** nav (29 items) | Not execution-first; huge role leakage of admin config/insights/sourcing | **REDESIGN + ROLE-RESTRICT** → new `OPS_NAV_GROUPS` (Work / Execution / Coordination, ~10 items) |
| **Turkey Importer Buyer** | simplified (prior branch) | already One Import→One Journey→One Workspace | **KEEP (no regression)** |
| **International Buyer** | 6 groups / 19 items, tests pin `sourcing` before `execution` | acceptable; terminology inconsistent (FreightIQ/Workspace Inbox) | **KEEP structure + terminology normalize** (Freight, Inbox) — deeper regroup deferred to protect tested contract |
| **Supplier** | 6 groups / ~11 items | reasonable; "FreightIQ" jargon | **KEEP + terminology normalize** (Freight) |
| **Broker** (CUSTOMS_BROKER) | 2 items (My Work, My Customs Cases) | already customs-execution focused; covered by `navigation.partner-customs.test.ts` | **KEEP** |
| **Trucker** | 2 items (My Work, My Deliveries) | already delivery-execution focused | **KEEP** |
| **Origin Agent** | 1 item (My Shipments) | minimal | **KEEP** |
| **Forwarder** | 2 items (Shipments, Notifications) | minimal portal | **KEEP** |
| **Sales Control** | 3 groups / 8 items | focused (accounts, RFQs, control tower, oversight) | **KEEP** |

## 3. Navigation before → after
- **Ops:** ADMIN(29 items, admin/config/sourcing noise) → **OPS(≈10 items):** Work (Work Queue `/operations`, Shipments, Exceptions) · Execution (Freight ops, Freight intake, Reference freight, Onboarding) · Coordination (Documents, Conversations, Notifications). Quick actions: Work Queue / Freight Ops / Exceptions / Shipments / Documents.
- **Admin:** operations(11)+workspaces(13)+home(3)+collab(2) → Home · Sourcing & Trade · Freight Ops · Containers · Communications · Org & Partners · Insights & Config (7 groups, ≤6 each; every route kept).
- **International Buyer / Supplier:** labels normalized ("FreightIQ"→"Freight", "Workspace Inbox"→"Inbox"); structure/testIds unchanged.
- **Turkey / Broker / Trucker / Sales / Forwarder / Origin:** unchanged.

## 4. Dashboards (audit + recommendations)
This round implements **navigation/IA + Ops routing to a work-first home (`/operations` Operations Center)**. Per-role dashboard component rewrites are classified and recommended (deferred here because they can't be compiled/verified in-sandbox and carry regression risk):
- **Ops home = `/operations` (Operations Center)** — already an execution work surface; now the Ops landing page. **KEEP** (no customer-dashboard-with-buttons).
- **Admin `/admin/dashboard` (Command Center)** — **REDESIGN (recommended):** lead with Action Inbox + escalation exceptions; demote decorative analytics tiles into "Insights".
- **Turkey Buyer** — command center already delivered (5-KPI + Attention + Active Imports). **KEEP.**
- **International Buyer** — **REDESIGN (recommended):** reduce KPI rows to sourcing-relevant metrics (do not inject Turkey/customs/inland).
- **Supplier `/supplier/dashboard`** — **REDESIGN (recommended):** Opportunities + Awarded + Required Actions first.
- **Broker/Trucker `/partner`** — already work-queue style. **KEEP.**

## 5. Workflows consolidated
- Turkey import journey already consolidated into the tabbed Import Workspace (prior branch, preserved).
- Ops execution consolidated at the IA level: one Work Queue entry (`/operations`) instead of scattered admin buckets.

## 6. Components reused / intentionally untouched
- **Reused:** `navGroupsForRole` / `quickActionsForRole` gating, the sidebar renderer (data-driven), all existing role pages/routes.
- **Untouched:** every backend module, Prisma, auth, tenant isolation, `requirePermission`, `sanitizeOffer` margin protection; Broker/Trucker/Origin/Forwarder/Sales navs; International group ids/order; the shared `ShipmentWorkspacePage`; all RFQ/CommodityBid/container modules.

## 7. Role-leakage fixes
- **Fixed:** Ops execution roles no longer see Admin-only config/insights (Executive, Growth, Market intel, System), container catalogs, or sourcing triage in their sidebar. These remain available to ADMIN/SUPER_ADMIN and enforced by backend authorization (UI hiding is not the security boundary — authz unchanged).
- **Verified no new leakage:** Turkey stays customs/inland; International stays sourcing (no Turkey terms injected); Broker/Trucker stay execution-only.

## 8. Status & terminology normalization
- Nav terminology normalized ("Freight" not "FreightIQ", "Inbox" not "Workspace Inbox", "Work Queue" for Ops, "Operations Center" for admin entry). Deep per-row FSM humanization for execution roles intentionally NOT hidden (execution needs detail) — customer-facing normalization already covered for Turkey via `@dmx/contracts/turkey-import-stage`.

## 9. Classification summary (before destructive change)
- KEEP: Turkey, Broker, Trucker, Origin, Forwarder, Sales, International structure, Supplier structure.
- REDESIGN: Admin nav (done), Ops nav (done via new surface), Admin/International/Supplier dashboards (recommended).
- ROLE-RESTRICT: Ops roles → Ops surface (done).
- MERGE/CONTEXTUALIZE: admin insights/config grouped (done).
- LEGACY/REMOVE-AFTER-VALIDATION: none removed this round.

## 10. Files changed this branch
- `apps/frontend/src/routes/navigation.ts` — new `OPS_NAV_GROUPS`/`OPS_QUICK_ACTIONS`; Admin regrouped; ops-role mappings (NAV_GROUPS_BY_ROLE, QUICK_ACTIONS_BY_ROLE, NAV_BY_ROLE); International/Supplier terminology.
- `apps/frontend/src/routes/navigation.multirole.test.ts` — new unit tests (Ops surface, admin grouping, capability preservation).

## 11. Tests
- **Executed:** none runnable in sandbox (no build).
- **Static validation:** ✅ new constant defined before use; ✅ all admin routes/testIds preserved; ✅ no dangling refs to removed admin group ids; ✅ icons still imported/used; ✅ International tested group-id contract (`sourcing`<`execution`, no `import-ops`) untouched.
- **UNVERIFIED (run in CI):** `yarn workspace @dmx/frontend typecheck && lint && test` (incl. `navigation.multirole.test.ts`, `navigation.sprint43*.test.ts`, `navigation.partner-customs.test.ts`), build, and all E2E (role nav isolation, route access, tenant isolation, authorization, margin protection, responsive, no 5xx).

## 12. Remaining UX gaps / P0-P1
- **P0:** none identified in implemented IA scope (pending CI/E2E).
- **P1:** per-role dashboard/table/CTA component redesigns (Admin, International, Supplier) — recommended, deferred for verifiability; International deeper regroup constrained by its pinned test contract; add i18n for new Ops/Admin labels; responsive polish audit on execution tables.

**Not production-ready until real build + E2E + role-isolation + tenant-isolation + authorization suites actually pass.**
