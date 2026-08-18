# Product Screenshot List

Capture after `yarn demo:seed`. Use **1920×1080**, light mode, browser chrome hidden. Filename pattern: `dmx-{area}-{screen}-{variant}.png`

---

## P0 — Website & pitch deck (capture first)

| # | Screen | Route | testId / ref | Filename | Notes |
|---|--------|-------|--------------|----------|-------|
| 1 | Landing hero | `/welcome` | `landing-page` | `dmx-landing-hero.png` | Full hero + CTAs |
| 2 | Landing pillars | `/welcome` | `landing-pillar-*` | `dmx-landing-pillars.png` | Scroll to 3-column section |
| 3 | Login brand panel | `/login` | `auth-layout` | `dmx-login-brand.png` | Desktop ≥1024px |
| 4 | Buyer command center | `/buyer/dashboard` | `buyer-dashboard-hero` | `dmx-buyer-dashboard.png` | ABC Foods buyer |
| 5 | RFQ workspace | `/workspace/rfq/:id` | — | `dmx-rfq-workspace.png` | `DEMO-RFQ-ABC-001` |
| 6 | CommodityBid workspace | `/workspace/commoditybid/:id` | — | `dmx-cb-workspace.png` | `DEMO-CB-ABC-001` |
| 7 | PO list | `/buyer/purchase-orders` | `po-list-page` | `dmx-po-list.png` | Show `DEMO-PO-ABC-001` |
| 8 | Control Tower | `/operations` | `operations-page` | `dmx-control-tower.png` | Open alerts visible |
| 9 | Shipment portfolio | `/shipments/portfolio` | — | `dmx-shipment-portfolio.png` | Map + table |

---

## P1 — Product detail & onboarding

| # | Screen | Route | testId | Filename |
|---|--------|-------|--------|----------|
| 10 | Buyer onboarding welcome | `/buyer/dashboard` | `buyer-onboarding-welcome` | `dmx-buyer-onboarding.png` | Expand onboarding section |
| 11 | Guided checklist | `/buyer/dashboard` | `guided-onboarding-card` | `dmx-buyer-checklist.png` |
| 12 | Supplier onboarding | `/supplier/dashboard` | `supplier-onboarding-welcome` | `dmx-supplier-onboarding.png` | `demo.pasta@` login |
| 13 | RFQ list empty state | `/buyer/rfq` | `rfq-list-empty` | `dmx-rfq-empty.png` | Use fresh buyer or filter to empty |
| 14 | Learning Center | `/learning` | `learning-center-page` | `dmx-learning-center.png` |
| 15 | SmartContainer home | `/buyer/mixed-container` | `mc-home-page` | `dmx-smartcontainer-home.png` |
| 16 | BulkContainer home | `/buyer/bulk-container` | `bc-home-page` | `dmx-bulkcontainer-home.png` |
| 17 | Order workspace | `/workspace/order/:id` | — | `dmx-order-workspace.png` | From demo PO chain |
| 18 | Shipment workspace | `/workspace/shipment/:id` | — | `dmx-shipment-workspace.png` | IN_TRANSIT demo |
| 19 | Exception Hub | `/exceptions` | `exception-hub-page` | `dmx-exception-hub.png` |
| 20 | Document center | `/documents` | — | `dmx-documents.png` |

---

## P2 — Admin & supplier views

| # | Screen | Route | Account | Filename |
|---|--------|-------|---------|----------|
| 21 | Admin dashboard | `/admin/dashboard` | admin | `dmx-admin-dashboard.png` |
| 22 | Onboarding admin | `/onboarding` | admin | `dmx-onboarding-admin.png` |
| 23 | Growth intelligence | `/operations/growth` | admin | `dmx-growth.png` |
| 24 | Supplier RFQ list | `/supplier/rfq` | demo.pasta | `dmx-supplier-rfq.png` |
| 25 | Supplier PO list | `/supplier/purchase-orders` | demo.pasta | `dmx-supplier-po.png` |
| 26 | FreightIQ embed | `/buyer/freightiq` | buyer | `dmx-freightiq.png` | If order has freight |
| 27 | Product tour overlay | any | — | `dmx-product-tour.png` | First login buyer |
| 28 | Customer demo shortcuts | `/login` | — | `dmx-login-demo-shortcuts.png` | ABC Foods block |

---

## Capture workflow

1. `yarn demo:seed`
2. `yarn dev:backend` + `yarn dev:frontend`
3. Playwright trace optional: `npx playwright test --headed` for consistent viewport
4. Store assets in `docs/launch-readiness/screenshots/` (gitignored) or shared drive
5. Annotate deck versions in Figma with ref numbers from this list

## Responsive variants (optional)

| Breakpoint | Width | Screens |
|------------|-------|---------|
| Desktop | 1440px | P0 all |
| Laptop | 1280px | P0 #4–8 |
| Tablet | 768px | Landing + buyer dashboard only |

## Do not capture

- `.env` or credentials in frame  
- Real customer names (use ABC Foods demo only)  
- E2E test workspaces (`E2E`, `Pilot` titles) — pollutes marketing narrative
