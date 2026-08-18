# Sprint 43 — Pre-Sales UI Copy / i18n Hygiene Patch

**Date:** 2026-08-17  
**Environment:** `https://workspace.demaxtore.com`  
**Account:** Türk İthalatçı (`buyer.utest@demaxtore.local`)  
**Mode:** copy + i18n only — no product development  
**Deploy:** `scripts/deploy-production.sh` — exit 0, buildTime `2026-08-17T11:02:56.805Z`

---

## The three issues

| ID | Defect | Production before |
|----|--------|-------------------|
| P1-1 | Raw key `s43.hero.subtitle.firstTrade` on Buyer dashboard hero | Visible under “Hello, Türk.” |
| P1-2 | Raw key `shipment.trackingDemoMode` on shipment tracking panel | Visible when provider is simulated/manual |
| P1-3 | Buyer onboarding accordion described RFQ → award → PO → shipment | Collapsed subtitle + welcome copy were sourcing-first |

---

## Root cause

`useT()` / `useLocale.t()` resolves:

`dict[key] ?? CATALOG.en[key] ?? fallback ?? key`

If the catalog has no entry **and** the call has no fallback, the raw key is rendered.

**P1-1.** Sprint 43 added `t("s43.hero.subtitle.*")` in `BuyerDashboardHero` without catalog entries and without the fallback used by neighbouring `s43.*` keys.

**P1-2.** `ShipmentTrackingPanel` called `t("shipment.trackingDemoMode")` when `provider === "manual"` / `"MANUAL"`. The key was never added to `workspace-en` / `workspace-tr`. Banner condition is unchanged: simulated/manual tracking only.

**P1-3.** `launch.buyer.*` strings (and `BUYER_ONBOARDING` in `launch-copy.ts`) still told the Launch Readiness sourcing story. The accordion header and welcome body used those keys. The step strings existed in the catalog but were not rendered.

---

## Files changed

Frontend copy / i18n / tests only:

- `apps/frontend/src/features/dashboard/components/command-center/BuyerDashboardHero.tsx`
- `apps/frontend/src/features/shipment/components/ShipmentTrackingPanel.tsx`
- `apps/frontend/src/features/dashboard/components/command-center/OnboardingSection.tsx`
- `apps/frontend/src/i18n/locales/dashboard-en.ts`
- `apps/frontend/src/i18n/locales/dashboard-tr.ts`
- `apps/frontend/src/i18n/locales/workspace-en.ts`
- `apps/frontend/src/i18n/locales/workspace-tr.ts`
- `apps/frontend/src/i18n/locales/launch-en.ts`
- `apps/frontend/src/i18n/locales/launch-tr.ts`
- `apps/frontend/src/content/launch-copy.ts`
- `apps/frontend/src/features/dashboard/pages/__tests__/BuyerDashboardPage.test.tsx`

**Business logic:** untouched  
**Backend / contracts / schema / FreightIQ / CustomsCase / Inland / Landed Cost:** untouched  
**Navigation architecture / sourcing grouping:** untouched  
**Existing onboarding CTA** retargeted from `/buyer/rfq/new` → `/buyer/imports/new` (same button, new label “Start import”). No new CTA, route, or API.

---

## Translations added / changed

### Hero (EN / TR)

| Key | EN | TR |
|-----|----|----|
| `s43.hero.subtitle.firstTrade` | Manage freight, customs and your import journey in one place. | Navlun, gümrük ve ithalat sürecinizi tek yerden yönetin. |
| `s43.hero.subtitle.standard` | same | same |
| `s43.hero.subtitle.power` | same | same |

Component fallbacks match the EN strings.

### Shipment tracking (EN / TR)

| Key | EN | TR |
|-----|----|----|
| `shipment.trackingDemoMode` | Tracking updates here are simulated in the workspace. This is not a live carrier GPS feed. | Buradaki takip güncellemeleri çalışma alanında simüle edilir. Canlı taşıyıcı GPS beslemesi değildir. |

Same-surface missing keys also added (no behavior change): `trackingStatus`, `delay`, `syncTracking`, `carrier`, `vessel`, `voyage`, `lastSync`, `provider`, `providerSimulated`, `trackingTimeline`, `noTrackingEvents`.

### Buyer onboarding (EN / TR)

- Title: Your import journey / İthalat yolculuğunuz
- Subtitle: Start with freight and customs… / Navlun ve gümrükle başlayın…
- Welcome: What do I do here? + freight/customs OS body with Ops handoff
- Six steps: Start import → freight quote → booking/shipment → customs → delivery/POD → landed cost
- Existing CTA label: Start import / İthalatı başlat

---

## Tests / build

| Check | Result |
|-------|--------|
| Frontend typecheck | PASS |
| `BuyerDashboardPage.test.tsx` (4) | PASS |
| `navigation.sprint43.test.ts` (4) | PASS |
| Frontend production build | PASS |
| `scripts/deploy-production.sh` | PASS |

---

## Production smoke

Account: Türk İthalatçı BUYER on `https://workspace.demaxtore.com`

| # | Check | Result |
|---|--------|--------|
| 1 | Buyer login | PASS (existing session) |
| 2 | Buyer dashboard renders | PASS |
| 3 | Hero copy | “Manage freight, customs and your import journey in one place.” |
| 4 | No `s43.hero.subtitle.firstTrade` | PASS (EN + TR) |
| 5 | Shipment tracking copy | Simulated-workspace wording |
| 6 | No `shipment.trackingDemoMode` | PASS |
| 7 | Onboarding no longer RFQ → award → PO | PASS (accordion header + welcome + 6 steps) |
| 8 | Get Freight Quote visible | PASS |
| 9 | Start Import visible | PASS |
| 10 | Import Operations visible | PASS |
| 11 | Sourcing secondary | PASS |
| 12 | Customs discoverable | PASS |
| 13 | Inland discoverable | PASS |
| 14 | Landed Cost discoverable | PASS |
| 15 | New console errors | 0 |
| 16 | `/api/healthz` | PASS (`status: ok`) |
| 17 | `/api/ready` | PASS (`ready: true`) |
| 18 | Unexpected 5xx | 0 |

TR hero: “Navlun, gümrük ve ithalat sürecinizi tek yerden yönetin.”

---

## Screenshots

`.sprint-43-evidence/pre-sales-hygiene/` (fresh post-deploy; not reused from `after/`):

| File | Subject |
|------|---------|
| `01-buyer-dashboard-hero.png` | Buyer dashboard hero (EN) |
| `02-buyer-onboarding-accordion.png` | Onboarding accordion expanded |
| `03-shipment-tracking-copy.png` | Shipment tracking simulated banner |
| `04-buyer-dashboard-hero-tr.png` | Buyer dashboard hero (TR) — extra locale check |

---

## Customer-presentation review

**Does any visible copy still imply the primary Turkey Buyer journey is RFQ → auction → award?**  
Hero, primary CTAs, Import Operations nav, and the accordion **welcome + six steps** do not. Sourcing remains a secondary nav group and optional dashboard section.

**Raw translation keys on the Sprint 43 customer journey?**  
None on dashboard hero, onboarding accordion, or shipment tracking panel (EN/TR).

**Self-service where Ops is required?**  
No. Freight step states Ops prepares the offer. Customs step is request + follow broker/document/clearance.

**Overclaim on customs / tracking / duty-tax / landed cost?**  
No. Tracking banner states simulated, not live GPS. Landed-cost step states unknown values are not treated as zero. Customs copy does not claim government filing.

---

## Unrelated issues observed — not fixed

1. **`GuidedOnboardingCard` (Trade Progress)** still uses the backend first-trade checklist: “Review quotations / Compare supplier offers on your RFQ” and steps Create RFQ → Receive quotation → Select supplier → Issue PO. Visible only after expanding Knowledge. Backend onboarding engine — out of scope.
2. **`CommodityBidOnboardingCard`** (“Reverse auction guide / Create auction”) still sits under the same accordion. Sourcing remains available; not removed.
3. **`GET /assets/maplibre-gl-worker.mjs` → 404** on shipment workspace map. Pre-existing static asset issue; not a 5xx; not caused by this patch.
4. Workspace Academy string `wa.task.buyerRfq` (“Create your first RFQ”) unchanged (Learning Center, not dashboard hero).

For a live demo: lead with the hero and the six-step accordion; do not dwell on Trade Progress if it is expanded.

---

## Final verdict

```
PRE-SALES UI COPY / I18N HYGIENE PATCH

Hero Raw Translation Key:
CLOSED

Shipment Tracking Raw Translation Key:
CLOSED

Buyer Onboarding GTM Copy:
ALIGNED

Freight + Customs Primary Story:
PRESERVED

Import OS Story:
PRESERVED

Sourcing Secondary Position:
PRESERVED

Self-Service Overclaim:
NO

Tracking Overclaim:
NO

Customs / Duty-Tax Overclaim:
NO

New Feature Added:
NO

Business Logic Changed:
NO

Backend Changed:
NO

Frontend Typecheck:
PASS

Frontend Production Build:
PASS

Production Buyer Smoke:
PASS

Raw I18N Keys On Tested Customer Surfaces:
0

Unexpected 5xx:
0

New P0:
0

COMMERCIAL PRODUCT CLAIM:
FREIGHT + CUSTOMS + IMPORT OPERATING SYSTEM
PRESERVED

PRE-SALES PRESENTATION READINESS:
READY

DEVELOPMENT FREEZE:
DO NOT RESUME

FINAL VERDICT:
PASS — READY FOR CUSTOMER SALES
```
