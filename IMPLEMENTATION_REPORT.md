# Turkey Importer Customer UX Redesign — Implementation Report

**Delivery form:** code implemented in the frontend of `Ygg-drasill3/demaxtore-workspace` (sparse checkout) and packaged as `turkey-ux-redesign.patch` (git-apply-able) + full copies of new/large files in this folder.
**Why a patch, not a push:** no GitHub write credentials, and the Node/Vite/Prisma monorepo cannot be built/run in this sandbox. **Runtime/browser/E2E are UNVERIFIED here** — see §Test results.
**Scope honored:** shared engine, proven capabilities, International Buyer, and Broker/Trucker/Ops execution surfaces were NOT modified. All Turkey behavior is gated by `buyerOperatingModel = TURKEY_IMPORTER` (default remains INTERNATIONAL).

Apply with: `git apply turkey-ux-redesign.patch` from the repo root (or `git apply --3way`).

---

## 1. Implementation summary (by phase)

- **Phase 1 — Navigation:** Turkey buyer sidebar reduced from 7 groups/~19 items to **3 groups/10 items** (HOME: Dashboard, My Imports, Inbox · OPERATIONS: Freight, Shipments, Customs, Deliveries · CONTROL: Control Tower, Documents, Landed Cost). Sourcing/Orders/Products/POs/Exceptions/Learning removed from Turkey nav (kept on platform, unchanged for International). Quick actions now lead with **Start Import**; `qa-new-rfq` removed.
- **Phase 2 — Dashboard:** Turkey branch is now a command center: **one 5-KPI strip** (Active Imports · In Transit · In Customs · Action Required · In Delivery) + **Attention Required** (honest severity/category/what/why/CTA) + **Active Imports**. Removed from Turkey: `TimelineKpiRow`, `BookingKpiRow`, `ActiveTradesTable`, the "Sourcing (optional)" section (`LiveAuctionsWidget`/`MyShipmentsWidget`), and the extra monitoring widgets. International branch unchanged.
- **Phase 3 — My Imports:** `ActiveImportsPage` rebuilt as the portfolio: filters (All/Action/Transit/Customs/Delivery/Completed), search, normalized stage badge, ETA, customs/delivery/next chips, attention flag; opens the new Import Workspace; mobile-friendly cards.
- **Phase 4 — Import Workspace:** new `ImportWorkspacePage` at `/buyer/imports/:id`. Header **Summary** (reference, title, route, PO link, normalized status, ETA, Continue→smart tab, compact stage progress) + **tabs** Journey / Shipment / Documents / Customs / Delivery / Costs that **compose existing panels** (no domain logic reimplemented). The shared `ShipmentWorkspacePage` (used by execution roles) is untouched.
- **Phase 5 — Status/terminology/CTA normalization:** new `@dmx/contracts/turkey-import-stage` maps backend FSM/customs/inland states → customer lifecycle (Preparing/Freight/Booking/In Transit/Customs/Delivery/Completed + Action Required) — presentation only, backend states unchanged. Customer terminology used; internal terms (externalRef→"Reference", spawnedFrom→"Purchase order", raw FSM/eventType) hidden or humanized. One primary CTA per surface.
- **Phase 6 — Responsive/consistency:** cards + segmented tabs, prioritizing status/attention/ETA/next-action on small screens. Start Import now offers 3 entry models (existing PO / new supplier PO / freight quote — spec §9).
- **Phase 7 — Regression prep:** navigation unit tests rewritten; International/Turkey/security validation commands listed below.

## 2. Files created (3)
- `apps/frontend/src/features/import-ops/pages/ImportWorkspacePage.tsx` — customer Import Workspace (tabbed wrapper).
- `packages/contracts/src/turkey-import-stage.ts` — customer stage normalization (pure, presentation-only).
- (tests) assertions added within existing nav test files.

## 3. Files modified (11)
- `apps/frontend/src/routes/navigation.ts` — Turkey `BUYER_NAV_GROUPS` + `BUYER_QUICK_ACTIONS` (International constants untouched).
- `apps/frontend/src/routes/index.tsx` — added `/buyer/imports/:id` route + lazy import.
- `apps/frontend/src/features/dashboard/pages/BuyerDashboardPage.tsx` — Turkey branch simplified (International branch byte-identical).
- `apps/frontend/src/features/dashboard/components/command-center/ImportExecutionKpiRow.tsx` — `max` prop (5 KPIs for Turkey), grid → 5 cols.
- `apps/frontend/src/features/dashboard/components/command-center/ActionInbox.tsx` — honest §8 Attention layout (real fields only).
- `apps/frontend/src/features/dashboard/components/command-center/ActiveImportsWidget.tsx` — link → `/buyer/imports/:id`.
- `apps/frontend/src/features/import-ops/pages/ActiveImportsPage.tsx` — My Imports redesign.
- `apps/frontend/src/features/import-ops/pages/StartImportPage.tsx` — third entry model (existing PO).
- `apps/frontend/src/i18n/locales/nav-en.ts`, `nav-tr.ts` — group `control`, labels Inbox / Control Tower.
- `apps/frontend/src/routes/navigation.sprint43.test.ts`, `navigation.sprint43r.test.ts` — updated to new IA.

## 4. Routes changed
- **Added:** `/buyer/imports/:id` → `ImportWorkspacePage` (Turkey buyer scope; execution roles keep `/workspace/shipment/:id`).
- **Re-pointed:** My Imports rows + dashboard Active Imports widget now open `/buyer/imports/:id` instead of `/workspace/shipment/:id`.
- **Unchanged:** all existing routes remain registered (nothing deleted).

## 5. Components reused (composed, not modified)
`ShipmentBookingPanel`, `ShipmentContainersPanel`, `ShipmentTrackingPanel`, `ShipmentJourneyMap`, `TurkeyCustomsPanel`, `InlandDeliveryPanel`, `LandedCostPanel`, `TradeDocumentsTab`, `ImportExecutionKpiRow`, `ActiveImportsWidget`, `ActionInbox`.

## 6. Components added
`ImportWorkspacePage` (+ local tab switcher, no new dependency), `turkey-import-stage` contract helper.

## 7. Components intentionally left untouched
`ShipmentWorkspacePage` (shared FSM execution for Broker/Trucker/Ops), `computeShipmentNextActions`, `ShipmentActionDrawer`, `WorkspaceActionModal`, all partner-workspace/broker/trucker/forwarder surfaces, all backend modules/Prisma/`sanitizeOffer` margin protection, RFQ/CommodityBid/Mixed/Bulk modules, and the entire International Buyer experience (`BUYER_NAV_GROUPS_INTERNATIONAL`, `InternationalBuyerHero`, International dashboard branch).

## 8. Turkey before → after
| Area | Before | After |
|---|---|---|
| Nav | 7 groups / 19 items, sourcing+orders leak | 3 groups / 10 items, no sourcing |
| Quick actions | Get Freight Quote first, incl. New RFQ | Start Import first, no sourcing CTA |
| Dashboard | 6 sections, 3 KPI rows, Active Trades + Live Auctions | 5-KPI strip + Attention + Active Imports |
| Import view | 1 route + ~18-panel shipment scroll, internal jargon | Summary + 6 tabs, normalized stages, customer language |
| My Imports | flat list, opened shipment WS | filters/search/normalized stage, opens Import Workspace |
| Status | raw FSM states | normalized Preparing→Completed + Action Required |
| Landed cost | discoverable but scattered | "Costs" tab (margin-free, unknown≠0 preserved) |

## 9. International Buyer protection summary
- Only the Turkey branches/constants were changed; International nav, hero, dashboard branch, quick actions are unchanged.
- Segmentation continues to use `organisation.buyerOperatingModel`; `resolveBuyerOperatingModel(undefined) === "INTERNATIONAL"` (default preserved). No email/UUID/fixture/org-name/locale/country logic added.
- New `/buyer/imports/:id` is additive; International keeps `/workspace/shipment/:id`.
- `navigation.sprint43r.test.ts` still asserts default = International and Turkey-only for explicit `TURKEY_IMPORTER`.

## 10. Test results
**Executed in this sandbox:** NONE runnable — the Node/Vite/Prisma app cannot be built here (arch/runtime mismatch; sparse checkout excludes `node_modules`). Static validation performed instead:
- ✅ Import/export styles verified (default: `ShipmentTrackingPanel`, `TradeDocumentsTab`; named: all panels).
- ✅ API methods exist (`customsApi.byShipment`, `inlandApi.byShipment`, `shipmentApi.get/timeline`).
- ✅ Contract subpath `@dmx/contracts/turkey-import-stage` resolves via frontend alias `@dmx/contracts/* → packages/contracts/src/*`.
- ✅ DTO fields referenced in `ImportWorkspacePage` mirror the compiling `ShipmentWorkspacePage`; `ShipmentPortfolioRow` fields (`eta`, `exceptionCount`) confirmed in contracts.
- ✅ No dangling references to removed nav ids/testIds outside updated tests (academy tour map is separate and non-breaking).

**UNVERIFIED (must run in real repo/CI) — do NOT treat as PASS:** all unit/component tests, typecheck, lint, build, and every browser/E2E flow.

## 11. Exact real-repo/CI validation commands
```bash
# from repo root
yarn install
yarn workspace @dmx/contracts build          # emit dist for turkey-import-stage
yarn workspace @dmx/frontend typecheck
yarn workspace @dmx/frontend lint
yarn workspace @dmx/frontend test src/routes/navigation.sprint43.test.ts \
                                   src/routes/navigation.sprint43r.test.ts \
                                   src/features/dashboard/pages/__tests__/BuyerDashboardPage.test.tsx
yarn workspace @dmx/frontend build
# E2E (Turkey isolation + International non-regression + security)
yarn workspace @dmx/e2e test    # or the project's Playwright command
# Before E2E, grep for any Playwright specs asserting removed Turkey nav testIds:
grep -rn "buyer-rfq\|buyer-commoditybid\|buyer-orders\|nav-group-import-ops\|qa-new-rfq" apps/e2e
```
Validate: Turkey nav isolation, Dashboard, My Imports, Import Workspace (all 6 tabs), Freight, Shipment, Documents, Customs, Delivery, Landed Cost, Control Tower; International nav/Dashboard/RFQ/CommodityBid/PO/Inspection/Documents/Timeline/Tracking/Exceptions; security = tenant isolation + authorization + margin non-leak.

## 12. Remaining gaps vs Master Spec v1.0
- **§14 unified timeline:** Import Workspace Journey shows the shipment timeline; customs/inland events are still in their own stores (not merged server-side). Cross-domain merge is an engine-adapter task (backend) — out of this customer-UX scope.
- **§15 exceptions:** Attention/Journey read from existing exception surfaces; the 4 backend stores are not yet unified (read-model task).
- **§8 Attention ownership:** only real fields rendered (severity/category/what/CTA); OWNER/WHY are shown only if the backend provides them (not fabricated).
- **§25 landed cost:** reused as-is (estimate/actual split depends on backend data).
- i18n: new customer strings use inline English fallbacks; add `tr` translations for `s43.import.*` / `s43.imports.*` keys for full Turkish polish.

## 13. Open P0/P1
- **P0:** none identified in the implemented customer-UX scope (pending CI/E2E confirmation).
- **P1:** run the CI/E2E suites (currently UNVERIFIED); add Turkish i18n for new keys; optional backend adapters for §14/§15 unification.

## 14. Recommended production rollout sequence
1. Apply patch on a branch; run typecheck/lint/unit; fix any environment-specific type nits.
2. Update/confirm Playwright specs for the new Turkey IA; run Turkey isolation + International non-regression + tenant isolation.
3. Manual UI acceptance on a Turkey org (`TURKEY_IMPORTER`) and an International org; capture screenshots (spec §49).
4. Ship behind the existing operating-model gate (no flag needed — International unaffected).
5. Follow-up backend adapters for unified timeline/exceptions (§14/§15) as a separate change.

**Do not declare production-ready until the real build, E2E, International non-regression, tenant isolation and production acceptance suites actually pass.**
