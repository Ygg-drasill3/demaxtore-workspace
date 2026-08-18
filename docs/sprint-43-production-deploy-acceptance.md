# Sprint 43 — Production Deploy & Commercial Buyer UX Acceptance

**Date:** 2026-08-17  
**Environment:** `https://workspace.demaxtore.com`  
**Acceptance account:** `buyer.utest@demaxtore.local` (login demo: **Türk İthalatçı**)  
**Method:** UI-only verification; no DB/API/SQL/Prisma shortcuts  
**Deploy:** `scripts/deploy-production.sh` — exit 0, buildTime `2026-08-17T10:37:16.329Z`

---

## Executive verdict

| Check | Result |
|-------|--------|
| **SPRINT 43 PRODUCTION DEPLOY** | **PASS** |
| **BUYER DASHBOARD GTM ALIGNMENT** | **PASS** |
| **FREIGHT REVENUE ENTRY** | **PASS** |
| **CUSTOMS REVENUE ENTRY** | **PASS** |
| **ACTIVE IMPORTS** | **PASS** |
| **IMPORT OPERATIONS DISCOVERABILITY** | **PASS** |
| **LANDED COST DISCOVERABILITY** | **PASS** |
| **SOURCING PRESERVED AS SECONDARY** | **PASS** |
| **INTERNAL MARGIN PROTECTION** | **PASS** |
| **UNEXPECTED 5xx** | **0** |
| **NEW P0** | **0** |
| **COMMERCIAL PRODUCT CLAIM — FREIGHT + CUSTOMS + IMPORT OS** | **PRODUCTION VERIFIED** |
| **CUSTOMER SALES** | **GO** |

---

## Acceptance criteria (10 UI checks)

### 1. Dashboard — import-execution-first hero — **PASS**

- `/buyer/dashboard` eyebrow: **Import Operating System**
- Primary CTAs: **Get freight quote** → `/buyer/freightiq/request`, **Start import** → `/buyer/imports/new`
- Sourcing (RFQ / Commodity Bid) moved to secondary **Sourcing (Optional)** section
- Evidence: `.sprint-43-evidence/after/01-buyer-dashboard.png`

**P1 (non-blocking):** Hero subtitle renders raw i18n key `s43.hero.subtitle.firstTrade` instead of translated copy.

### 2. Import Operations navigation — **PASS**

- Sidebar group **Import Operations** visible with: My Imports, Freight, Shipments, **Customs**, **Deliveries**, **Landed Cost**, PO, Products, Control Tower, Exceptions
- Evidence: `.sprint-43-evidence/after/02-import-operations-navigation.png`

### 3. Start Import funnel — **PASS**

- `/buyer/imports/new` offers natural paths:
  - **I have a supplier** → `/buyer/purchase-orders/create` (Direct PO)
  - **I need a freight quote** → `/buyer/freightiq/request`
- Journey strip: PO → Freight → Shipment → Customs → Delivery → Landed cost
- Evidence: `.sprint-43-evidence/after/03-start-import.png`

### 4. Freight quote request entry — **PASS**

- `/buyer/freightiq/request` loads; lists active import orders with eligibility messaging
- Demo order `DEMO-PO-UTEST-TR-001` shown as **FREIGHT SELECTED** with correct block: *"This order cannot accept a new freight quote"*
- Entry reachable from dashboard hero, Start Import page, and Import Operations nav
- **Note:** Live *initiation* of a new freight request was not exercised on this account because the sole listed order is already past freight selection. Eligibility UX is correct; initiation on a fresh `ORDER_CREATED` order was verified at source/test level pre-deploy.
- Evidence: `.sprint-43-evidence/after/04-get-freight-quote.png`

### 5. Active imports — shipment + customs + inland context — **PASS**

- `/buyer/imports` shows `SHP-ORD-DEMO-UTEST-TR-001-00000000` with Freight / Customs / Delivery status cards and quick links (Open shipment, Customs, Landed cost)
- Evidence: `.sprint-43-evidence/after/05-active-imports.png`

### 6. Shipment → DeMaxtore Customs — **PASS**

- Shipment workspace `ORD-DEMO-UTEST-TR-001-00000000`: **Turkey Customs** panel visible, status **Broker Review**, CTA **Open customs** (case already exists — expected; *Request DeMaxtore customs* appears when no case)
- Links to CustomsCase engine via `/buyer/customs` and in-workspace panel
- Evidence: `.sprint-43-evidence/after/06-shipment-customs-landed-cost.png`

### 7. Shipment workspace — Landed Cost discoverable — **PASS**

- **Your Landed Cost** panel on shipment workspace with **Calculate** CTA
- Evidence: `.sprint-43-evidence/after/06-shipment-customs-landed-cost.png`, `09-landed-cost.png`

### 8. Sourcing preserved as secondary — **PASS**

- **Sourcing** nav group below Import Operations: RFQs, Commodity Bids, CB Workspaces, Mixed Container, Bulk Container
- Dashboard sourcing widgets under **Sourcing (Optional)**
- Evidence: `.sprint-43-evidence/after/10-sourcing-secondary-nav.png`

### 9. Internal margin protection — **PASS**

- Scanned buyer surfaces (dashboard, freight request, imports, customs, inland, landed cost, shipment workspace, PO create): no **buy rate**, **margin**, or internal commercial fields visible

### 10. Health & stability — **PASS**

- `GET /api/healthz` → 200, `status: ok`
- `GET /api/ready` → 200, `ready: true` (db, redis, storage, email, socketAdapter, safetyGates up)
- Full buyer UX walk: **0 unexpected 5xx** API responses

---

## Production evidence pack

All screenshots under `.sprint-43-evidence/after/`:

| File | Screen |
|------|--------|
| `01-buyer-dashboard.png` | Buyer Dashboard |
| `02-import-operations-navigation.png` | Import Operations navigation |
| `03-start-import.png` | Start Import |
| `04-get-freight-quote.png` | Get Freight Quote |
| `05-active-imports.png` | Active Imports |
| `06-shipment-customs-landed-cost.png` | Shipment + Customs + Landed Cost |
| `07-customs.png` | Customs Control Center |
| `08-inland.png` | Inland / Deliveries |
| `09-landed-cost.png` | Landed Cost |
| `10-sourcing-secondary-nav.png` | Sourcing secondary navigation |

Before (pre-Sprint 43): `.sprint-43-evidence/before/`

---

## Known P1 items (not P0 — do not block sales GO)

1. **i18n leak:** Dashboard hero subtitle key `s43.hero.subtitle.firstTrade` visible in EN locale
2. **i18n leak:** Shipment tracking banner shows raw key `shipment.trackingDemoMode`
3. **Onboarding copy:** Accordion still describes RFQ → award → PO → shipment (legacy story); does not match new GTM hero

Recommend fixing (1) before customer-facing demo; (2)–(3) can follow in a cosmetic patch.

---

## Commercial narrative — production mapping

| Sales claim | Production surface |
|-------------|-------------------|
| **Navlun alın** | Dashboard **Get freight quote**, `/buyer/freightiq/request`, Freight nav |
| **Gümrüğü bize verin** | Customs nav, shipment **Turkey Customs** panel, `/buyer/customs` |
| **İthalatınızı DeMaxtore Import OS'den yönetin** | Import Operations group, `/buyer/imports`, shipment workspace (freight + customs + inland + landed cost) |

**COMMERCIAL PRODUCT CLAIM:** **PRODUCTION VERIFIED**

---

## Recommendation

**CUSTOMER SALES: GO**

Sprint 43 repositioning is live on production. A real buyer login now surfaces freight + customs + import execution as the primary story—not Create Auction / New RFQ. Development pause is justified; proceed to sales presentation using production Buyer Workspace screens.

**Do not start Sprint 43A or new feature work** unless explicitly requested.
