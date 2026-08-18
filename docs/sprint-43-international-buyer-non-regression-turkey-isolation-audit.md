# Sprint 43 — International Buyer Non-Regression & Turkey Isolation Audit

**Date:** 2026-08-17  
**Mode:** Read-only forensic audit — **no code changes, no remediation**  
**Production:** `https://workspace.demaxtore.com`  
**Primary question:** Did Sprint 43 isolate the Turkey Importer experience, or did it change generic BUYER surfaces so International Buyers now receive Turkey-specific positioning?

---

## Executive answer

Sprint 43 implemented the Turkey Importer commercial story by **modifying generic BUYER surfaces globally**. There is **no buyer-level Turkey vs International segmentation**.

**Shared engines remain intact.** RFQ, CommodityBid, Mixed/Bulk Container, shipments, tracking, exceptions, and documents still function for an International Buyer.

**The International Buyer homepage, navigation priority, and onboarding were replaced** with the Turkey importer GTM (freight + customs + Import OS). That was not authorized as a redesign of the existing International Buyer product.

**Customs execution itself is destination-gated** (`isTurkeyCountryCode` on PO/route). An ABC Foods Germany shipment does **not** show `TurkeyCustomsPanel`. The **list pages and nav labels** still say “Turkey Customs” / “Turkey Inland” for every BUYER.

**FINAL VERDICT:** **FAIL — TURKEY PRODUCT POSITIONING LEAKED INTO INTERNATIONAL BUYER**

---

## 0. Compliance

| Rule | Status |
|------|--------|
| No code changes | **HONORED** |
| No remediation | **HONORED** |
| No Sprint 43A / 44 | **HONORED** |
| No production business-state mutation | **HONORED** (read-only UI navigation) |
| Discover → Diff → Trace → Test → Classify → Report | **HONORED** |

---

## 1. Product boundary (from repository, not memory)

### A — International Buyer (pre-existing)

Documented as the **ABC Foods Germany sourcing scenario** (`apps/backend/prisma/seed-demo.ts`, `demo-ids.ts`, LoginPage `CUSTOMER_DEMO_SHORTCUTS`):

> “Customer demo seed — ABC Foods Germany sourcing scenario.”  
> Org: **ABC Foods Germany**. User: **Anna Becker — ABC Foods**. Market: **Germany, Austria**. Destination: **Germany**.

Pre-Sprint-43 buyer home (product-completion audit + `.sprint-43-evidence/before/01-buyer-dashboard.png`):

- Hero: **Create Auction** + **New RFQ**
- Story: **RFQ → award → PO → shipment**
- Nav priority: **Sourcing first**, then **Execution** (PO, Products, Orders, FreightIQ, My Shipments, Control Tower, Exceptions)
- Sourcing: RFQ, CommodityBid, CB Workspaces, Mixed Container, Bulk Container

Also present before Sprint 43 (not Turkey-only): Inspection engine, Trade Timeline KPIs, live shipment tracking, Alert/Exception Hub, Document Hub, Trade Documents, International Execution Bridge **component** (Sprint 36A — **not mounted**).

### B — Turkey Importer

Documented in `docs/turkey-customer1-commercial-brief.md` and Sprint 43 docs:

- ICP: **Turkey importer** (buyer org), origin → **Turkey**
- Revenue: Freight + Customs brokerage
- Differentiation: Import Operating System
- Fixture: `buyer.utest@demaxtore.local` / **Türk İthalatçı** (`seed-pilot-empty-users.ts`, destination **TR**)

These are **two ICPs**. International = sourcing **from** Turkey **into** another market. Turkey Importer = importing **into Turkey**.

---

## 2. Primary audit question

**Did Sprint 43 isolate Turkey, or change generic BUYER globally?**

**Globally.** `NAV_GROUPS_BY_ROLE.BUYER = BUYER_NAV_GROUPS` with comment *“Sprint 43 Turkey GTM”*. `BuyerDashboardHero` comment: *“import-execution-first buyer home hero (Turkey GTM)”*. No `if (turkey)` / market flag / feature flag wraps these surfaces.

---

## 3. Git / diff forensics

### Commit status

| Item | Evidence |
|------|----------|
| Git HEAD | `snapshot/pre-pilot-20260714` + 18 messaging commits |
| Sprint 43 commit | **NONE** — `git log -S 'Import Operations' -- navigation.ts` empty |
| Hygiene patch commit | **NONE** |
| Working tree | Sprint 43 + hygiene live in uncommitted files + production dist |

Sprint 43 cannot be bisected as a SHA. Reconstruction uses:

1. Sprint 43 docs file lists  
2. `.sprint-43-evidence/before/` (2026-08-17 pre-deploy)  
3. `docs/turkey-importer-product-completion-audit.md` (same-day pre-Sprint-43 production)  
4. `git show HEAD:apps/frontend/src/routes/navigation.ts` (older July sourcing-first nav)  
5. Current production UI  

### A. Sprint 43 files (from `docs/sprint-43-turkey-importer-commercial-workspace-repositioning.md`)

| File | Class | International Buyer receives it? |
|------|-------|----------------------------------|
| `apps/frontend/src/routes/navigation.ts` | **GLOBAL BUYER** | **YES** — all `Role.BUYER` |
| `navigation.sprint43.test.ts` | OTHER (tests) | n/a |
| `BuyerDashboardHero.tsx` | **GLOBAL BUYER** | **YES** |
| `BuyerDashboardPage.tsx` | **GLOBAL BUYER** | **YES** |
| `ImportExecutionKpiRow.tsx` | **GLOBAL BUYER** | **YES** |
| `ActiveImportsWidget.tsx` | **GLOBAL BUYER** | **YES** |
| `buyer-command-center.ts` | SHARED COMPONENT | KPI wiring; all buyers |
| `StartImportPage.tsx` / `FreightQuoteRequestPage.tsx` / `ActiveImportsPage.tsx` | **GLOBAL BUYER** | Routes under `RequireRole BUYER` |
| `apps/frontend/src/routes/index.tsx` | **GLOBAL BUYER** | New `/buyer/imports*` + `/buyer/freightiq/request` for all buyers |
| `ShipmentWorkspacePage.tsx` | **SHARED COMPONENT** | LandedCost + Inland + TurkeyCustoms **mounted for every shipment**; customs **self-hides** if not TR-eligible |
| `TurkeyCustomsPanel.tsx` | TURKEY-SCOPED (runtime) | Only if `customsApi.eligibility` true |
| `packages/contracts/src/freightiq.ts` | **BACKEND POLICY** | `FREIGHTIQ_ORDER_ELIGIBLE_STATES` expanded for **all** buyer quote requests |

### B. Production deploy

`scripts/deploy-production.sh` — no product logic; ships the global BUYER tree.

### C. Pre-sales i18n/copy patch

| File | Class | International impact |
|------|-------|----------------------|
| `BuyerDashboardHero.tsx` fallbacks + `dashboard-en/tr` `s43.hero.subtitle.*` | **I18N ONLY** on **GLOBAL BUYER** | International sees freight/customs subtitle |
| `OnboardingSection.tsx` + `launch-en/tr` + `launch-copy.ts` | **GLOBAL BUYER** | International onboarding replaced RFQ→award→PO |
| `ShipmentTrackingPanel.tsx` + `workspace-en/tr` | **I18N ONLY** / SHARED | Honest simulated-tracking copy for all buyers |
| `BuyerDashboardPage.test.tsx` | OTHER | n/a |

### GLOBAL BUYER / SHARED — what changed

| Surface | Pre-Sprint-43 (17 Aug audit + before PNG) | Post-Sprint-43 production | Intended Turkey-only? | Alters International journey? |
|---------|-------------------------------------------|---------------------------|----------------------|-------------------------------|
| Hero CTAs | Create Auction, New RFQ | Get freight quote, Start import | Yes (Turkey GTM docs) | **YES** — primary action changed |
| Hero subtitle | RFQ → award → PO / operational overview | Manage freight, customs and your import journey in one place | Yes | **YES** |
| Nav order | Sourcing → Execution | Import Operations → Sourcing | Yes | **YES** — sourcing demoted |
| Nav adds | Customs/Inland/TLC **routes existed, not in sidebar** | All three in sidebar, labeled Turkey on pages | Discoverability was Turkey gap | International now sees Turkey-labeled ops pages |
| Onboarding | RFQ → award → PO | Freight → customs → delivery → landed cost | Yes (P1 patch) | **YES** |
| Quick actions | Create Bid, New RFQ, Mixed Container… | Get Freight Quote, Start Import, … | Yes | **YES** |
| FreightIQ policy | Stricter buyer create states | From `ORDER_CREATED` onward | Framed as Turkey T1 | All buyers can request earlier |
| Shipment WS | Tracking; customs panel already eligibility-gated | + LandedCostPanel always; Request customs CTA if eligible | TLC was T1 Turkey | International shipment now has TLC panel (engine already existed) |

**No International capability was deleted from routes.** Sourcing items remain. Execution items remain (Orders split to a lower group; FreightIQ relabeled **Freight**).

---

## 4. Buyer segmentation — what actually exists

### Legitimate signals in schema/code

| Signal | Exists? | Used to split BUYER UX? |
|--------|---------|-------------------------|
| `Organisation.kind` | YES (`BUYER_ORG` / `SUPPLIER_ORG` / `DEMAXTORE`) | NO — both ICPs are `BUYER_ORG` |
| `Organisation.location` | YES, optional string | **NO** UX branch |
| User `role` | YES | YES — only `BUYER` vs other roles |
| Destination country on PO / freight route | YES | YES — **customs eligibility only** (`isTurkeyCountryCode`) |
| Feature flag / market / commercial profile / tenant operating model | **NO** | — |

`isTurkeyCountryCode` (`packages/contracts/src/customs.ts`): `TR` / `TUR` / `TURKEY` / `TÜRKİYE` / contains TURKEY|TURKIYE. Used in `customs.service.ts` eligibility. **Shipment-level, not buyer-level.**

### Unsafe / hard-coded segmentation controlling product experience

Searched: email matching, fixture names, UUIDs, `"turkey"` string checks, test-account checks as **UX gates**.

**None found** that switch dashboard/nav/onboarding. Comments and copy say “Turkey” but **all BUYER accounts get the same chrome**.

Pilot emails (`buyer.utest@…`) and ABC (`demo.buyer@demaxtore.com`) are **fixtures only**, not runtime product switches.

**Legitimate market segmentation mechanism:** **PARTIAL** (destination-country for customs cases). **Buyer product experience: not segmented.**

---

## 5. International Buyer baseline (pre-Sprint-43)

Reconstructed from 17 Aug completion audit + before screenshot + HEAD nav (July) + seed-demo.

| Area | Pre-Sprint-43 |
|------|----------------|
| Homepage | Buyer Command Center; sourcing CTAs |
| Primary CTAs | Create Auction, New RFQ |
| Navigation | Home → **Sourcing** → **Execution** → Collaboration → Documents → Knowledge |
| Sourcing entry | First group: RFQ, CB, MC, BC |
| RFQ | `/buyer/rfq`, workspace `/workspace/rfq/:id` |
| CommodityBid | `/buyer/commoditybid`, `/buyer/commoditybid/list` |
| Inspection | Backend + `InspectionWorkspacePage`; **never in buyer sidebar**; **no `/workspace/inspection/:id` route in `index.tsx` (also absent at git HEAD)** |
| Timeline | Dashboard `TimelineKpiRow` (links `/buyer/rfq`); RFQ/order workspace steppers; PO OperationalTimeline |
| Live tracking | Shipment workspace `ShipmentTrackingPanel` |
| Alerts | `/notifications` |
| Exceptions | `/exceptions` in Execution group |
| Document Hub | `/documents` |
| Trade Documents | `/buyer/trade-documents` (Compliance) |
| Logistics | FreightIQ + My Shipments in Execution (secondary to sourcing) |

Preservation requires discoverability and mental model, not only route existence.

---

## 6. Production International Buyer test

**Account chosen:** `demo.buyer@demaxtore.com`  
**Why International (repository proof):**

- `seed-demo.ts`: “ABC Foods Germany sourcing scenario”
- Org name **ABC Foods Germany**; display name **Anna Becker — ABC Foods**
- `targetMarket` / `destinationMarket`: **Germany**
- LoginPage: “ABC Foods Germany scenario”
- **Not** the Turkey fixture (`buyer.utest` / Türk İthalatçı / `PILOT_TR_DEMO` destination TR)

Password: seeded `Passw0rd!` (`DEMO_PASSWORD`). UI login only. No mutations.

Production identity observed: **Anna Becker — ABC Foods · BUYER**.

Evidence: `.sprint-43-international-regression-evidence/`

| File | Subject |
|------|---------|
| `01-intl-buyer-dashboard.png` | Homepage / hero |
| `02-intl-buyer-nav.png` | Navigation |
| `03-intl-onboarding.png` | Accordion |
| `04-intl-rfq.png` | RFQ list |
| `05-intl-commoditybid.png` | CB embed |
| `05b-intl-cb-workspaces.png` | CB list |
| `06-intl-exceptions.png` | Alert Hub |
| `07-intl-document-hub.png` | Documents |
| `08-intl-trade-documents.png` | Trade Documents |
| `09-intl-shipments.png` | Shipments |
| `10-intl-control-tower.png` | Control Tower |
| `11-intl-mixed-container.png` | Mixed Container |
| `12-intl-bulk-container.png` | Bulk Container |
| `13-intl-customs.png` | Customs list (Turkey-labeled, empty) |
| `14-intl-inland.png` | Inland list (Turkey-labeled, empty) |
| `15-intl-landed-cost.png` | Landed Cost |
| `16-intl-my-imports.png` | My Imports |
| `17-intl-alerts.png` | Notifications |
| `18-intl-shipment-tracking.png` | ABC shipment tracking; **no** Turkey Customs panel |
| `19-intl-inspection-route.png` | `/workspace/inspection/:id` → Page not found |
| `20-intl-rfq-workspace.png` | Awarded RFQ workspace |
| `21-turkey-spotcheck-dashboard.png` | Türk İthalatçı still GTM-aligned |

### Observed on ABC Foods (production)

- Hero: **Import Operating System** + **Get freight quote** + **Start import**
- Subtitle: **Manage freight, customs and your import journey in one place.**
- Create Auction / New RFQ **absent** from hero (`createAuction: 0`, `newRfqHero: 0`)
- Nav: **Import Operations** above **Sourcing**
- Dashboard section **Sourcing (optional)** still present
- RFQ list **RFQ Workspaces** 200
- CommodityBid list **Commodity Bids** 200; `/buyer/commoditybid` embed “Open CommodityBid in a new tab”
- Exceptions, Documents, Trade Documents, Shipments, MC, BC, Control Tower, Notifications: **200, render**
- Shipment `SHP-ORD-DEMO-RFQ-ABC-002`: tracking panel **present**; `turkey-customs-panel` **count 0** (eligibility works)
- Landed Cost copy **present** on that shipment workspace
- Customs/Inland list pages: **“TURKEY CUSTOMS” / “TURKEY INLAND”** empty states
- Console errors on walk: **0**
- Unexpected **5xx: 0** (pre-existing `maplibre-gl-worker.mjs` 404 only)

---

## 7. International capability matrix

| CAPABILITY | PRE-SPRINT-43 | POST-SPRINT-43 | DISCOVERABLE? | FUNCTIONAL? | UX PRIORITY CHANGED? | TURKEY CHANGE LEAKED? | VERDICT |
|------------|---------------|----------------|---------------|-------------|----------------------|----------------------|---------|
| Sourcing nav group | First after Home | After Import Operations | Yes, lower | Yes | **YES** | Yes (demoted / “optional”) | **CHANGED BUT NON-BREAKING** |
| RFQ | Primary CTA + nav | Nav only (secondary) | Yes | Yes — list + workspace | **YES** | Hero no longer RFQ | **CHANGED BUT NON-BREAKING** |
| CommodityBid | Primary CTA Create Auction | Nav secondary | Yes | Yes — list; embed is thin | **YES** | Hero lost Create Auction | **CHANGED BUT NON-BREAKING** |
| Mixed / Bulk Container | Sourcing group | Same group, lower | Yes | Yes | Yes (group order) | No unique Turkey copy | **PRESERVED** |
| Inspection | Not in nav; page exists; **route missing at HEAD** | Unchanged missing route | Weak (lineage links 404) | Engine exists; UI route 404 | No | No | **INSUFFICIENT EVIDENCE** of Sprint 43 regression (pre-existing) |
| Timeline | Dashboard KPIs + workspaces | Same KPIs still on dashboard | Yes | Yes (RFQ stepper observed) | No | No | **PRESERVED** |
| Live Shipment Tracking | Shipment WS | Same + i18n hygiene copy | Yes | Yes (ABC in-transit) | No | Copy global, not Turkey-specific | **PRESERVED** |
| Alerts | Notifications | Same | Yes | Yes | No | No | **PRESERVED** |
| Exceptions | Execution nav | Import Operations nav | Yes | Yes | Slight group move | No | **PRESERVED** |
| Document Hub | Documents group | Same | Yes | Yes | No | No | **PRESERVED** |
| Trade Documents | Compliance | Same | Yes | Yes | No | No | **PRESERVED** |
| Purchase Orders / Products / Orders | Execution | Import Ops / Orders | Yes | Not deep-tested | Grouping changed | No | **CHANGED BUT NON-BREAKING** |
| FreightIQ | Execution “FreightIQ” | Import Ops “Freight” | Yes | Route live | Relabel + higher | Entry pushed as primary GTM | **CHANGED BUT NON-BREAKING** |
| International homepage story | Sourcing-first | Freight/customs Import OS | n/a | Renders | **YES** | **YES** | **TURKEY CHANGE LEAKED** |
| Customs list | Hidden route | Sidebar + **Turkey** chrome | Newly high | Empty for DE dest | **YES** | **YES** (label) | **TURKEY CHANGE LEAKED** |
| Inland list | Hidden route | Sidebar + **Turkey Inland** | Newly high | Empty | **YES** | **YES** | **TURKEY CHANGE LEAKED** |

---

## 8. Dashboard forensic comparison

| Element | Before (International product = generic BUYER home) | ABC Foods production now |
|---------|------------------------------------------------------|--------------------------|
| Eyebrow | Buyer · Command Center | **Import Operating System** |
| Subtitle | RFQ → award → PO / operational overview | **Manage freight, customs and your import journey in one place.** |
| Primary CTA | New RFQ | **Start import** |
| Secondary CTA | Create Auction | **Get freight quote** |
| Metrics | RFQ/auction-heavy + timeline | Import execution KPI row first |
| Widgets | Live Auctions prominent | Active imports + **Sourcing (optional)** |
| Onboarding | RFQ journey | Freight/customs/delivery/landed cost |
| Trade Progress | First-trade RFQ engine (if shown) | Still RFQ checklist when expanded (backend) |
| Nav grouping | Sourcing first | Import Operations first |

**Classification:** **TURKEY COMMERCIAL POSITIONING LEAK** — not a shared generic Import OS improvement.

Evidence: Sprint 43 source-of-truth docs and code comments name **Turkey GTM**. Customs/Inland pages are explicitly **Turkey** products. International ICP (Germany destination) is not a Turkey importer.

Landing copy already said “OS for companies sourcing **from** Turkey”; that is **origin-Turkey sourcing**, not **importer-into-Turkey**. Sprint 43 homepage now sells the latter to both.

---

## 9. Onboarding regression

P1 patch changed `launch.buyer.*` **globally**. ABC Foods accordion:

- Title: Your import journey  
- Body: DeMaxtore manages freight and customs…  
- Steps 1–6: Start import → freight quote → booking → **customs** → delivery → landed cost  
- CTA: Start import → `/buyer/imports/new` (was Create RFQ)

**Global. Replaced International sourcing onboarding.**

**Contradiction (documented, not fixed):** `GuidedOnboardingCard` still uses backend first-trade RFQ checklist (“Review quotations / Create RFQ…”) under the same accordion when that engine has data. Hygiene report already noted this on the Turkey account. International buyers can see **freight/customs copy + RFQ Trade Progress** together.

---

## 10. Route / navigation regression

Sprint 43 **globally** added to every BUYER:

My Imports, Freight (relabel), Customs, Deliveries, Landed Cost, Import Operations group.

| Question | Answer |
|----------|--------|
| Replace anything? | Did not delete RFQ/CB/MC/BC/Documents. **Replaced primary order and hero.** Execution group renamed/split. |
| International items disappeared? | **No** |
| Ordering changed materially? | **Yes** — Sourcing is secondary |
| Sourcing secondary globally? | **Yes** |
| Inspection/Tracking/Exceptions/Documents reachable? | Exceptions/Documents/Tracking **yes**. Inspection **never in nav**; workspace URL **404** (pre-existing) |

---

## 11. International workflow walk

| Workflow | Route exists? | Navigable? | UI renders? | Data/empty? | Console error? | 5xx? | Blocked by Sprint 43? |
|----------|---------------|------------|-------------|-------------|----------------|------|------------------------|
| RFQ discovery | Yes | Yes | RFQ Workspaces | Seeded ABC RFQs | 0 | 0 | No — harder as primary |
| RFQ workspace | Yes | Yes | Awarded pasta programme | Loaded | 0 | 0 | No |
| CommodityBid discovery | Yes | Yes | List + thin embed | Renders | 0 | 0 | No |
| Inspection discovery | Page file yes; **route no** | Link 404 | Page not found | n/a | 0 | 0 | **No — pre-existing** |
| Timeline discovery | Dashboard KPIs + RFQ stepper | Yes | Yes | Yes | 0 | 0 | No |
| Shipment tracking | Yes | Yes | Simulated banner | ABC in transit | 0 | 0 | No |
| Alerts | `/notifications` | Yes | Yes | Renders | 0 | 0 | No |
| Exceptions | `/exceptions` | Yes | Alert Hub | Renders | 0 | 0 | No |
| Document Hub | `/documents` | Yes | Documents | Renders | 0 | 0 | No |
| Trade Documents | `/buyer/trade-documents` | Yes | Yes | Renders | 0 | 0 | No |

---

## 12. Turkey product safety (spot-check)

Account: `buyer.utest@demaxtore.local` · **Türk İthalatçı User Test**  
Evidence: `21-turkey-spotcheck-dashboard.png`

| Check | Result |
|-------|--------|
| Dashboard GTM | PRESERVED — Get freight quote + Start import |
| Import Operations nav | PRESERVED |
| Customs / Deliveries / Landed Cost | PRESERVED in nav |
| Sourcing secondary | PRESERVED |

Turkey importer chrome was **not** removed by testing International. Both personas currently share the **same** chrome; Turkey still has it.

---

## 13. Shared engine vs product experience

| SHARED CORE | INTERNATIONAL BUYER EXPERIENCE | TURKEY IMPORTER EXPERIENCE |
|-------------|-------------------------------|----------------------------|
| Auth, organisations (`kind` only), RBAC | Role=BUYER shell (**now shared with Turkey GTM**) | Same shell |
| Products, PO, Orders, Shipments | RFQ / CommodityBid / MC / BC as **primary commercial story (lost on home)** | Direct PO / freight quote as **primary (now global home)** |
| FreightIQ request/offer/booking | Freight as execution after award | Freight as **revenue entry #1** |
| Tracking, documents, exceptions, timeline KPIs | Same engines | Same engines |
| Inspection module | Intended international QC continuation; **route gap pre-existing** | Not GTM-primary |
| Landed cost engine | Useful shared economics | GTM differentiation surface |
| CustomsCase + `isTurkeyCountryCode` | Panel **hidden** on DE shipment | Panel **shown** on TR shipment |
| Inland delivery | Turkey-labeled list still in nav | TR inland execution |

**International Execution Bridge** (`InternationalExecutionBridgePanel`) is **dead code** (never imported). Not caused by Sprint 43; means the “international continuation” UX was already incomplete.

---

## 14. Regression severity

| ID | Class | Description |
|----|-------|-------------|
| — | **R0** | **0.** No International workflow made unusable. No capability removed. |
| R1-1 | **R1** | Generic BUYER **homepage** replaced with Turkey freight/customs GTM (ABC Foods). |
| R1-2 | **R1** | Generic BUYER **nav priority**: Sourcing demoted; Import Operations + Turkey-labeled Customs/Inland promoted for all buyers. |
| R1-3 | **R1** | P1 onboarding patch **globally** replaced RFQ→award→PO with freight/customs/delivery/landed cost. |
| R2-1 | **R2** | Landed Cost panel mounted on all shipment workspaces. |
| R2-2 | **R2** | FreightIQ buyer-eligible order states expanded globally. |
| R2-3 | **R2** | New shared routes (`/buyer/imports`, `/buyer/freightiq/request`) available to all buyers. |
| R2-4 | **R2** | Tracking i18n hygiene (honest simulated copy) on all buyers. |
| R3 | **R3** | 0 additional cosmetic-only items beyond R2-4. |

Pre-existing (not Sprint 43): missing `/workspace/inspection/:id` route; unmounted International Execution Bridge; maplibre worker 404.

---

## 15. Decision matrix

International Dashboard Preserved: **NO**  
International Sourcing: **PRESERVED**  
International RFQ: **PRESERVED**  
International CommodityBid: **PRESERVED**  
International Inspection: **PRESERVED** (pre-existing route gap unchanged)  
International Timeline: **PRESERVED**  
International Live Shipment Tracking: **PRESERVED**  
International Alerts: **PRESERVED**  
International Exceptions: **PRESERVED**  
International Document Hub: **PRESERVED**  
International Trade Documents: **PRESERVED**  
Turkey Freight: **PRESERVED**  
Turkey Customs: **PRESERVED**  
Turkey Import Operations: **PRESERVED**  
Turkey Landed Cost: **PRESERVED**

---

## 16. Architecture questions

1. Did Sprint 43 change generic BUYER components? **YES**  
2. Did Sprint 43 change the International Buyer homepage? **YES**  
3. Did Sprint 43 change International Buyer navigation priority? **YES**  
4. Did the P1 onboarding patch affect International Buyers? **YES**  
5. Were any International capabilities removed? **NO**  
6. Were any International capabilities made materially harder to discover? **YES** (sourcing/RFQ/auction no longer primary)  
7. Were any International workflows broken? **NO** (inspection 404 pre-existing)  
8. Are Turkey-specific commercial messages shown to International Buyers? **YES**  
9. Does a legitimate market/segment mechanism currently exist? **PARTIAL**  
10. Are Turkey and International experiences currently intentionally isolated? **NO**  
11. Can they be isolated without duplicating the transaction engine? **YES**  
12. Is remediation actually required? **YES** (positioning isolation — not a rebuild)

---

## 17. Remediation recommendation (DO NOT IMPLEMENT)

**Do not revert Sprint 43. Do not duplicate FreightIQ/Customs/Shipment engines.**

Smallest safe path:

1. Introduce a **buyer commercial profile** on `Organisation` (or reuse `location` only if product already treats it as market — it does not today). Values e.g. `TURKEY_IMPORTER` vs `INTERNATIONAL_SOURCING`. **No email/UUID/fixture-name checks.**
2. Keep **one** `Role.BUYER` engine.
3. Split **chrome only**:
   - International default: restore sourcing-first home + nav (Create Auction / New RFQ primary; Execution group; FreightIQ as execution).
   - Turkey importer: keep current Import Operations home + freight/customs CTAs + onboarding.
4. Keep **destination-based** `isTurkeyCountryCode` for customs/inland **panels** (already correct).
5. Hide or relabel **Turkey Customs / Turkey Inland** nav items unless profile is Turkey importer **or** the tenant has TR-destination activity.
6. Do not change booking FSM, deposit gate, CustomsCase lifecycle, or margin rules.

**Estimate: M**

Likely areas: `navigation.ts`, `BuyerDashboardHero`, `BuyerDashboardPage`, `OnboardingSection` / `launch-*`, org config + auth `me` payload. Backend: small org field + read API. Not a domain rewrite.

**XS is insufficient** (would require unsafe email/org-name branching). **L/XL not required** (no engine split).

---

## 18. Evidence index

- International: `.sprint-43-international-regression-evidence/01`–`20`  
- Turkey spot-check: `21-turkey-spotcheck-dashboard.png`  
- Pre-Sprint-43 BUYER home: `.sprint-43-evidence/before/01-buyer-dashboard.png`  
- Sources: Sprint 43 docs, product-completion audit, `seed-demo.ts`, `navigation.ts`, `customs.service.ts`

**Code changed during this audit: NO**

---

## Final verdict

```
SPRINT 43 — INTERNATIONAL BUYER NON-REGRESSION & TURKEY ISOLATION AUDIT

Sprint 43 Generic BUYER Changes:
YES

P1 Patch Generic BUYER Changes:
YES

International Dashboard:
REGRESSED

International Navigation:
REGRESSED

International Sourcing:
PRESERVED

International RFQ:
PRESERVED

International CommodityBid:
PRESERVED

International Inspection:
PRESERVED

International Timeline:
PRESERVED

International Live Shipment Tracking:
PRESERVED

International Alerts / Exceptions:
PRESERVED

International Document Hub / Trade Documents:
PRESERVED

International Existing Workflows Broken:
NO

Turkey Freight Experience:
PRESERVED

Turkey Customs Experience:
PRESERVED

Turkey Import Operations:
PRESERVED

Turkey Landed Cost:
PRESERVED

Turkey Commercial Positioning Visible To International Buyer:
YES

Legitimate Market Segmentation Mechanism Exists:
PARTIAL

R0 Open:
0

R1 Open:
3

R2 Observations:
4

Unexpected 5xx:
0

Code Changed During Audit:
NO

Remediation Required:
YES

Recommended Remediation Scope:
M

FINAL VERDICT:
FAIL — TURKEY PRODUCT POSITIONING LEAKED INTO INTERNATIONAL BUYER

NEXT ACTION:
TARGETED SEGMENTATION REMEDIATION
```
