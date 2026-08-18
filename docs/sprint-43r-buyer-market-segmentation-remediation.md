# Sprint 43R — Buyer Market Segmentation Remediation

**Date:** 2026-08-17  
**Mode:** Targeted presentation segmentation — no new product features, no second logistics engine, Sprint 44 not started  
**Production:** `https://workspace.demaxtore.com`  
**Deploy:** `scripts/deploy-production.sh` (migration `20260817140000_buyer_operating_model` applied)

---

## 1. Root cause

Sprint 43 and the pre-sales i18n/onboarding patch changed **generic `Role.BUYER` chrome**:

| Surface | Global leak |
|---------|-------------|
| Dashboard hero | Import Operating System + Get Freight Quote / Start Import |
| Navigation | Import Operations first; sourcing demoted |
| Onboarding | `launch.buyer.*` rewritten to freight → customs → delivery → landed cost |
| Quick actions | Freight / Start Import first |

There was **no buyer-level commercial profile**. `Role.BUYER` was treated as one product. ABC Foods Germany (International Buyer) received Turkey Importer GTM.

International **capabilities** were not deleted (R0 = 0). This was a **positioning leak**, not an engine regression.

---

## 2. Exact Sprint 43 global leaks (remediated)

Files that applied Turkey GTM to every BUYER:

- `apps/frontend/src/routes/navigation.ts` — `NAV_GROUPS_BY_ROLE.BUYER = BUYER_NAV_GROUPS` (Import Operations)
- `apps/frontend/src/features/dashboard/pages/BuyerDashboardPage.tsx` — import-ops KPI layout
- `apps/frontend/src/features/dashboard/components/command-center/BuyerDashboardHero.tsx` — Turkey hero/CTAs
- `apps/frontend/src/features/dashboard/components/command-center/OnboardingSection.tsx` — Turkey journey + `/buyer/imports/new`
- `apps/frontend/src/i18n/locales/launch-en.ts` / `launch-tr.ts` — `launch.buyer.*` overwritten
- `apps/frontend/src/content/launch-copy.ts` — `BUYER_ONBOARDING` overwritten
- `apps/frontend/src/layouts/components/Sidebar.tsx` / `MobileNav.tsx` — nav from role only

Shipment destination was **not** used as the buyer-product selector (correct). `isTurkeyCountryCode` already gated `TurkeyCustomsPanel`.

---

## 3. Segmentation source chosen

**No durable existing field** represented buyer commercial product. Inspected:

| Candidate | Verdict |
|-----------|---------|
| `Organisation.kind` | `BUYER_ORG` / `SUPPLIER_ORG` / `DEMAXTORE` — role family, not market product |
| `Organisation.location` | Free text, unused as product selector |
| Feature flags / settings | None for buyer GTM |
| Shipment destination | Correct for **shipment** customs eligibility; must **not** redefine the workspace product |
| Email / name / UUID | **Forbidden** as runtime selector |

**Chosen source of truth:** organisation-level typed field

```
Organisation.buyerOperatingModel  TEXT  default 'INTERNATIONAL'
values: INTERNATIONAL | TURKEY_IMPORTER
```

Exposed on `UserDTO.buyerOperatingModel` via login / register / `/auth/me` / Google / passwordless.

**Why durable**

- Organisation/tenant-level, not user-email
- Typed token, not string-contains
- Prisma default `INTERNATIONAL` — existing buyers do **not** silently become Turkey
- Frontend resolves unknown/missing → `INTERNATIONAL`
- Independent of shipment destination
- Not authorization (routes unchanged; chrome only)

Runtime UX **never** branches on email, domain, fixture name, or org UUID.

---

## 4. Data migration / configuration

Migration `apps/backend/prisma/migrations/20260817140000_buyer_operating_model/migration.sql`:

1. Add `buyer_operating_model` `NOT NULL DEFAULT 'INTERNATIONAL'`
2. Set `TURKEY_IMPORTER` **only** on the seed-owned fixture org from `seed-pilot-empty-users.ts` (`ORG_IDS.buyer` = `00000000-0000-0000-0000-00000000e001`)

That UPDATE is **seed-owned configuration**, not a runtime UUID selector.

Seeds:

- `seed-pilot-empty-users.ts` — User Test TR Importer Co → `TURKEY_IMPORTER`
- `seed-demo.ts` — ABC Foods Germany → `INTERNATIONAL` (explicit)
- Public register / Google new orgs → Prisma default `INTERNATIONAL`

### Production classification (authoritative only)

| Organisation | Model | Basis |
|--------------|-------|--------|
| User Test TR Importer Co | `TURKEY_IMPORTER` | Seed fixture `ORG_IDS.buyer` |
| ABC Foods Germany | `INTERNATIONAL` | Demo International Buyer seed |
| All other `BUYER_ORG` rows | `INTERNATIONAL` | Default — **not inferred** |

**Not classified as Turkey Importer** (names/emails/language/history must not decide this):

| Organisation | User | Note |
|--------------|------|------|
| Turkey Pilot Trading | `pilot.turkey@demaxtore.local` | Name looks Turkey-related; **no authoritative GTM flag** |
| Türkiye | `fatihkymzz35@gmail.com` | Org name only — **requires explicit config** if this tenant is Turkey Importer GTM |
| Other live buyer orgs (ECODIS, GROWE EXIM, IST TOGO, …) | — | Remain International until explicitly configured |

To promote a tenant: set `organisations.buyer_operating_model = 'TURKEY_IMPORTER'` for that org id. Do not infer from shipments.

---

## 5. Files changed

**Contracts / data**

- `packages/contracts/src/buyer-operating-model.ts` (+ test)
- `packages/contracts/src/auth.ts` — `UserDTO.buyerOperatingModel`
- `packages/contracts/src/index.ts`
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20260817140000_buyer_operating_model/migration.sql`
- `apps/backend/prisma/seed-pilot-empty-users.ts`
- `apps/backend/prisma/seed-demo.ts`

**Auth mapping (not authorization)**

- `apps/backend/src/modules/auth/auth.service.ts`
- `apps/backend/src/modules/auth/google-oauth.ts`
- `apps/backend/src/modules/passwordless-access/passwordless-access.service.ts`

**Presentation**

- `apps/frontend/src/routes/navigation.ts` — `navGroupsForRole` / `quickActionsForRole`; International groups restored from pre-Sprint-43 HEAD + Products
- `apps/frontend/src/layouts/components/Sidebar.tsx`
- `apps/frontend/src/layouts/components/MobileNav.tsx`
- `apps/frontend/src/features/dashboard/pages/BuyerDashboardPage.tsx`
- `apps/frontend/src/features/dashboard/components/command-center/BuyerDashboardHero.tsx`
- `apps/frontend/src/features/dashboard/components/command-center/OnboardingSection.tsx`
- `apps/frontend/src/content/launch-copy.ts`
- `apps/frontend/src/i18n/locales/launch-en.ts` / `launch-tr.ts`
- `apps/frontend/src/i18n/locales/dashboard-en.ts` / `dashboard-tr.ts`

**Tests**

- `apps/frontend/src/features/dashboard/pages/__tests__/BuyerDashboardPage.test.tsx`
- `apps/frontend/src/routes/navigation.sprint43.test.ts`
- `apps/frontend/src/routes/navigation.sprint43r.test.ts`

**Unchanged (shared engine)**

FreightIQ, shipment FSM, tracking, exceptions, document hub, customs case lifecycle, inland, landed cost, `isTurkeyCountryCode` / `TurkeyCustomsPanel` eligibility.

---

## 6. International before / after

| Surface | After Sprint 43 (leak) | After 43R |
|---------|------------------------|-----------|
| Hero | Import OS + Get freight quote / Start import | Buyer Command Center + **Create Auction** / **New RFQ** |
| Subtitle | Manage freight, customs… | Operational overview (pre-S43 `dash.buyer.subtitle.*`) |
| Nav | Import Operations first | **Sourcing first**, then Execution (PO, Products, Orders, FreightIQ, My Shipments, Control Tower, Exceptions) |
| Onboarding | Freight → customs → landed cost | RFQ → award → PO → shipment; CTA `/buyer/rfq/new` |
| Customs/Inland/Landed Cost in primary nav | Yes | No (pre-S43). Routes remain reachable; not authorization |

Production account: `demo.buyer@demaxtore.com` / Anna Becker / ABC Foods Germany  
`buyerOperatingModel: INTERNATIONAL`  
`data-hero-variant=international`

---

## 7. Turkey before / after

Sprint 43 Turkey GTM **retained**:

- Hero: Import Operating System + Get freight quote + Start import
- Nav: Import Operations (My Imports, Freight, Shipments, Customs, Deliveries, Landed Cost, …) then Sourcing
- Onboarding: freight → shipment → customs → delivery → landed cost; CTA `/buyer/imports/new`

Production account: `buyer.utest@demaxtore.local` / Türk İthalatçı User Test  
`buyerOperatingModel: TURKEY_IMPORTER`  
`data-hero-variant=turkey_importer`

---

## 8. Shared engine preservation

One FreightIQ / shipment / customs / inland / landed-cost / document / exception engine.

Presentation selects **chrome**. Authorization, FSMs, and destination eligibility are unchanged.

International buyers still have FreightIQ, My Shipments, Exceptions, Documents in nav. Turkey-specific **commercial** entries (My Imports, Customs, Deliveries, Landed Cost) stay on the Turkey nav. Shared routes are not 403-hidden.

---

## 9. Shipment-level Turkey eligibility (independent)

`GET /api/customs/shipments/:id/eligibility` + `TurkeyCustomsPanel` (`eligible === false` → not rendered).

| Shipment | Buyer chrome | Destination | `eligible` | Panel |
|----------|--------------|-------------|------------|--------|
| ABC Foods DE (`81967346-…`) | INTERNATIONAL | not TR (`QAHMD`) | **false** | **absent** |
| UTest TR (`31362445-…`) | TURKEY_IMPORTER | `TR` | **true** | **present** |

An International Buyer with a future TR-destination shipment may still use Turkey customs **on that shipment**. That does not flip their dashboard to Turkey Importer GTM.

---

## 10. Security results

Phase 12 IDOR sweep (`node apps/backend/scripts/phase-12-idor-sweep.mjs`):

```
total 69  pass 69  fail 0
p0Open 0  p1Open 0  p2Open 0
unexpected5xx 0
```

Covers buyer cross-tenant denial, broker isolation, trucker isolation, document isolation, and partner payload margin keys (`buyRate` / `margin` / `totalLandedCost`). JSON: `.sprint-43-segmentation-evidence/phase-12-idor-summary.json`.

Role permissions were not weakened. Segmentation is UI composition only.

---

## 11. Production dual-buyer acceptance

Evidence: `.sprint-43-segmentation-evidence/{international,turkey}/`

### International — ABC Foods Germany

| Check | Result |
|-------|--------|
| Dashboard model | `INTERNATIONAL` |
| Hero | Create Auction + New RFQ; **no** Get freight quote / Start import / Import OS |
| Nav | Sourcing (RFQs, Commodity Bids, CB Workspaces, Mixed/Bulk Container) before Execution |
| Onboarding | Sourcing command center; CTA `/buyer/rfq/new` |
| RFQ / CB / Shipments / Exceptions / Documents / Trade Documents / Control Tower | HTTP 200, no raw i18n keys, not dead ends |
| DE shipment workspace | `turkey-customs-panel` **absent** |

### Turkey — User Test TR Importer Co

| Check | Result |
|-------|--------|
| Dashboard model | `TURKEY_IMPORTER` |
| Hero | Get freight quote + Start import; Import Operating System |
| Nav | Import Operations first; Sourcing still present |
| Onboarding | Import journey; CTA `/buyer/imports/new` |
| My Imports / Freight / Freight quote / Customs / Deliveries / Landed Cost / RFQ / Shipments / Exceptions / Documents | HTTP 200, no raw i18n keys |
| TR shipment workspace | `turkey-customs-panel` **present** |

### Known leftovers (not 43R regressions)

- `InspectionWorkspacePage` exists but `/workspace/inspection/:id` is **not registered** in `routes/index.tsx` (pre-Sprint-43 / audit). Engine preserved; deep-link gap unchanged.
- Expanded Turkey onboarding still mounts `GuidedOnboardingCard` (RFQ first-trade engine). Welcome copy is Turkey-correct; the engine was not rewritten per non-goals.
- Public marketing landing copy is out of this sprint’s buyer-workspace scope.

---

## 12. Cross-market matrix

| Capability | International | Turkey |
|------------|---------------|--------|
| Dashboard positioning | **PASS** | **PASS** |
| Sourcing | **PASS** | **PASS** (secondary nav) |
| RFQ | **PASS** | **PASS** |
| CommodityBid | **PASS** | **PASS** |
| Inspection | **PASS** (engine; pre-existing route gap) | **PASS** (same) |
| Timeline | **PASS** (KPI row + Control Tower) | **PASS** |
| Live Shipment Tracking | **PASS** | **PASS** |
| Alerts / Exceptions | **PASS** | **PASS** |
| Document Hub | **PASS** | **PASS** |
| Freight | **PASS** (FreightIQ in Execution) | **PASS** (primary) |
| Shipment | **PASS** | **PASS** |
| Turkey Customs eligibility | **PASS** (DE: ineligible) | **PASS** (TR: eligible) |
| Inland | **N/A** as GTM primary; route exists | **PASS** |
| Landed Cost | **N/A** as GTM primary; route exists | **PASS** |

Prominence is **not** required to be identical.

---

## 13. Final verdict

```
SPRINT 43R — BUYER MARKET SEGMENTATION REMEDIATION

Durable Buyer Market Segmentation:
PASS

Email / UUID / Fixture Hack Used:
NO

Shared Transaction Engine Preserved:
YES

International Dashboard:
PASS

International Navigation:
PASS

International Onboarding:
PASS

International Sourcing:
PASS

International RFQ:
PASS

International CommodityBid:
PASS

International Inspection:
PASS

International Timeline:
PASS

International Live Shipment Tracking:
PASS

International Alerts / Exceptions:
PASS

International Document Hub / Trade Documents:
PASS

International Existing Workflows Broken:
NO

Turkey Dashboard:
PASS

Turkey Freight:
PASS

Turkey Customs:
PASS

Turkey Import Operations:
PASS

Turkey Inland / Delivery:
PASS

Turkey Landed Cost:
PASS

Turkey Sourcing Preserved:
YES

Shipment-Level Turkey Eligibility Preserved:
YES

Tenant Isolation:
PASS

Internal Margin Protection:
PASS

Unexpected 5xx:
0

New P0:
0

R0 Open:
0

R1 Open:
0

Turkey Positioning Leaking To International:
NO

International Positioning Replacing Turkey:
NO

COMMERCIAL PRODUCT — TURKEY:
FREIGHT + CUSTOMS + IMPORT OPERATING SYSTEM
VERIFIED

INTERNATIONAL BUYER PRODUCT:
PRESERVED

DEVELOPMENT FREEZE:
RESUME

FINAL VERDICT:
PASS — BOTH BUYER PRODUCTS SAFELY PRESERVED
```
