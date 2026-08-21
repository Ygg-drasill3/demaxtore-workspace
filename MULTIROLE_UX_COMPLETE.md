# Multi-Role UX — Completion Phase (dashboards & work queue)

**Base:** `workspace-multirole-ux-redesign` → **new branch:** `workspace-multirole-ux-complete`
**Nature:** presentation/composition only. No backend/Prisma/auth/tenancy/engine changes. Truthful UI (no fabricated SLA/owner). **Runtime/build/E2E UNVERIFIED** (Node app not buildable in sandbox).

## What changed this phase
### 1. Ops Work Queue (`/operations`) — REDESIGN ✅
- Before: read-only "Control Tower" overview (PO overview + freight KPIs + funnels + alert tables lower down). Not work-first.
- After: a prioritized **Work Queue** section prepended at the top — open alerts sorted by **severity then age**, each row: severity badge, category, title, description, **age from real `createdAt`**, workspace ref, and **Open + Resolve** CTAs (reusing the existing `resolveAlert` mutation + `workspacePath`). The existing overview remains below (progressive disclosure).
- Truthful UI: only real `ControlTowerAlert` fields used. **Owner/SLA intentionally omitted** (backend does not track them on alerts) — no fabrication.

### 2. Admin / Super Admin dashboard — REDESIGN ✅
- Before: KPI → PhoneVerifications → Action Inbox → Trade board → (grids) Auction/FreightIQ → Shipments → Document/Communication/**ControlTower** → **Revenue**/Workload/Events.
- After: escalation **ControlTowerPanel elevated** directly under the Action Inbox (admin attention first). Document/Communication row reduced to 2-col. Commercial **RevenuePanel de-emphasized** to the bottom secondary trio. Same components/props (safe reorder).

### 3. International Buyer dashboard — KEEP (documented limitation)
- Sourcing-first branch already exists (KPI + Timeline + Booking rows, Active Trades, Live Auctions). Deeper KPI-row trimming is a visible change to a **protected, test-pinned** product; deferred to avoid unverifiable regression (per directive §11: lowest-risk = no change, documented). No Turkey terminology present. Recommendation for CI-backed change: drop `BookingKpiRow` from the International branch and collapse the monitoring trio.

### 4. Supplier dashboard — KEEP
- Already action-first: `SupplierActionInbox` (required actions) → `OpportunityCenter` (RFQs/auctions) → `ExecutionCenter` (awarded/orders) → doc/comms/events trio. Meets "what needs response / awarded / to produce / blocked." No change needed.

### 5. Terminology + i18n ✅
- Added en+tr `nav.group.*` keys for all new groups (Ops: work/execution/coordination; Admin: sourcing-trade/freight-ops/containers/communications/org-partners/insights-config). Turkey `control` group keys already added prior. No mixed-language nav where translations exist.

### 6. Responsive ✅
- Work-queue rows use `flex-col sm:flex-row` stacked summaries (status/issue/age/next-action first), not compressed tables. Admin grids collapse to single column on small screens (existing behavior preserved).

## Role isolation re-audit
- Ops: execution surface only (no admin config/sourcing; from prior branch). Work queue reuses ops-visible alerts. ✅
- Admin/Super Admin: broad grouped control surface retained. ✅
- Turkey Buyer: untouched (no regression). ✅
- International: sourcing identity intact, no Turkey wording. ✅
- Supplier/Broker/Trucker/Sales/Origin/Forwarder: unchanged. ✅
- Backend authorization unchanged (UI is not the security boundary).

## Files changed this phase
- `apps/frontend/src/features/control-tower/pages/OperationsPage.tsx` — Ops Work Queue.
- `apps/frontend/src/features/dashboard/pages/AdminDashboardPage.tsx` — escalation elevated, revenue de-emphasized.
- `apps/frontend/src/i18n/locales/nav-en.ts`, `nav-tr.ts` — new group labels.

## Tests
- **Executed:** none (no runnable build in sandbox).
- **Static validation:** ✅ brace/bracket/paren balance on both pages; ✅ `ControlTowerAlert` import via `@dmx/contracts/*` alias; ✅ reused in-scope `open`/`handleResolve`/`resolve.isPending`/`workspacePath`; ✅ single ControlTowerPanel render in admin.
- **UNVERIFIED (run in CI):** typecheck, lint, unit, build, all E2E (role-nav isolation, route access, tenant isolation, authorization, margin protection, responsive, no 5xx).

## Remaining P0/P1
- **P0:** none in implemented scope (pending CI/E2E).
- **P1:** International dashboard KPI-row trim (needs CI to protect its test contract); per-role list/table column audits (execution tables) for density; add SLA/owner to work queue **only if** backend begins tracking them.

Not production-ready until real build + E2E + role-isolation + tenant-isolation + authorization actually pass.
