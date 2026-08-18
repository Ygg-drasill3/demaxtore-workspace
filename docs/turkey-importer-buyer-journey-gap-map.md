# Turkey Importer — Buyer Journey Gap Map

**Audit date:** 2026-08-17  
**Production:** `https://workspace.demaxtore.com`  
**Test persona:** Buyer `buyer.utest@demaxtore.local` (“Türk İthalatçı”)  
**Mode:** Read-only forensic audit

---

## Journey A — Freight acquisition

**Scenario:** “Çin'den Türkiye'ye konteynerim geliyor ve navlun fiyatı istiyorum.”

| Step | Expected (Turkey GTM) | Observed | Gap |
|------|----------------------|----------|-----|
| Login | Importer workspace | PASS — buyer dashboard loads | — |
| First guidance | Freight / quote CTA | **FAIL** — hero CTAs are "Create Auction" + "New RFQ"; no freight/customs entry | **GTM misalignment** |
| Discover FreightIQ | Obvious nav or dashboard | **PARTIAL** — “FreightIQ” in sidebar (secondary position) | Not primary path |
| Create quote request | Self-service form | **FRICTION** — deposit gate; R4 used admin freight create | **OPS-DEPENDENT** |
| Receive offers | Buyer UI | PASS — FreightIQ workspace | — |
| Compare / select | Buyer UI | PARTIAL — basic offer list | UX polish |
| Accept / book | Buyer UI | PARTIAL — possible with deposit cleared | Deposit friction |
| Shipment created | Lineage preserved | PASS — R4 proved | Requires upstream PO/import context |

**Journey A verdict:** **FRICTION** (not DEAD END — capability exists with ops assist)

**Smallest remediation (audit only — not implemented):** Dashboard hero + primary CTA → “Get freight quote” / “New import”; relax or explain deposit gate for pilot buyers.

---

## Journey B — Customs acquisition

**Scenario:** “Bu shipment'ın gümrük işlemlerini DeMaxtore yapsın.”

| Step | Expected | Observed | Gap |
|------|----------|----------|-----|
| Select DeMaxtore customs | Explicit service CTA | **MISSING** — no buyer “Request customs brokerage” | **5 — backend exists, UX missing** |
| Trigger broker assignment | Buyer or auto on TR import | **OPS** — partner assignment; seed demo shows broker assigned | No self-service discovery |
| Upload documents | Trade docs + customs checklist | PARTIAL — Trade Documents nav; customs docs in shipment panel | Scattered |
| Track status | Buyer-visible states | PARTIAL — `TurkeyCustomsPanel` in **shipment workspace only** | Not in nav; requires finding shipment |
| See CLEARED | Clear outcome | PASS when case exists (demo seed) | Hidden unless user opens correct shipment |
| Duty/tax visibility | Estimate or “unknown” | PASS — duty engine + “Not provided” | Not on dashboard |

**Journey B verdict:** **FRICTION** → **DEAD END** for untrained user who doesn’t know to open shipment workspace

**Evidence:** Routes `/buyer/customs`, `/buyer/inland`, `/buyer/landed-cost` exist (`apps/frontend/src/routes/buyerRoutes.tsx`) but **absent from** `navigation.ts` buyer sidebar.

---

## Journey C — Existing import monitoring

**Scenario:** “Mevcut ithalatım nerede?”

**Required lineage (single mental model):**

```
PO → Freight → Booking → Shipment → Container → Customs → Inland → POD → Landed Cost
```

| Link | Exists in product? | Single-screen lineage? | Buyer discoverable? |
|------|-------------------|------------------------|---------------------|
| PO | Yes | Partial — PO list | Nav: Purchase Orders |
| Freight | Yes | In FreightIQ / shipment | Nav: FreightIQ |
| Booking | Yes | Shipment workspace | Embedded |
| Shipment | Yes | Shipment workspace + My Shipments | Nav: My Shipments |
| Container | Partial | MC/BC programs OR shipment | Separate programs |
| Customs | Yes | Shipment panel only | **Not in nav** |
| Inland | Yes | Route + backend | **Not in nav** |
| POD | Yes | Inland/trucker flow | Ops-assisted |
| Landed Cost | Yes | `/buyer/landed-cost` | **Not in nav**; panel not mounted in shipment WS |

**Dashboard evidence (production UI, 2026-08-17):**

- Headline flow: **“RFQ → award → PO → shipment”** (sourcing-first)
- Metrics/cards: RFQ counts, active shipments (demo TR shipment visible when seeded)
- No unified “Import #123” control-tower row linking all stages for one transaction

**Journey C verdict:** **PARTIAL** — capabilities exist in separate surfaces; **NOT READY** as one import journey without training

**Import Control Tower** (`/buyer/control-tower`): provides operational visibility but does not replace transaction-centric lineage for a new importer.

---

## Buyer navigation inventory (production)

Source: `apps/frontend/src/routes/navigation.ts` + production UI verification

| Nav item | Route | Purpose | Works? | Primary/Secondary | Turkey import relevance |
|----------|-------|---------|--------|-------------------|-------------------------|
| Dashboard | `/buyer/dashboard` | Home | Yes | Primary | **Misaligned** — sourcing hero |
| RFQs | `/buyer/rfq` | Sourcing auctions | Yes | Primary | D — not Turkey GTM #1 |
| Commodity Bids | `/buyer/commoditybid` | CB programs | Yes | Secondary | D |
| CB Workspaces | `/buyer/commoditybid/list` | Bid workspaces | Yes | Secondary | D |
| Mixed Container | `/buyer/mixed-container` | MC program | Yes | Secondary | E |
| Bulk Container | `/buyer/bulk-container` | BC program | Yes | Secondary | E |
| Purchase Orders | `/buyer/purchase-orders` | PO management | Yes | Primary | C (Direct PO path) |
| Products | `/buyer/products` | Product Master | Yes | Secondary | C |
| Orders | `/buyer/orders` | Order list | Yes | Secondary | C |
| FreightIQ | `/buyer/freightiq` | Freight quotes | Yes | Secondary | **A — should be primary** |
| My Shipments | `/buyer/shipments` | Shipment list | Yes | Primary | C |
| Import Control Tower | `/buyer/control-tower` | Ops visibility | Yes | Secondary | C |
| Exceptions | `/buyer/exceptions` | Action items | Yes | Secondary | C |
| Messages | `/buyer/messages` | Comms | Yes | Secondary | C |
| Notifications | `/buyer/notifications` | Alerts | Yes | Secondary | C |
| Trade Documents | `/buyer/trade-documents` | Doc hub | Yes | Secondary | C |
| **Customs** | `/buyer/customs` | Customs list | Route works | **NOT IN NAV** | **B — IMPLEMENTED BUT NOT DISCOVERABLE** |
| **Landed Cost** | `/buyer/landed-cost` | TLC | Route works | **NOT IN NAV** | **C — NOT DISCOVERABLE** |
| **Inland** | `/buyer/inland` | Inland deliveries | Route works | **NOT IN NAV** | **A — NOT DISCOVERABLE** |

---

## Golden Path (R4) vs natural importer journeys

| Question | R4 answer | Natural journey answer |
|----------|-----------|------------------------|
| Trained operator completes transaction in UI? | **YES** (with ops steps documented) | **NO** without ops |
| New Turkish importer initiates freight? | Not tested as primary path | **FRICTION / OPS** |
| New importer requests customs? | Not tested as buyer-initiated | **DEAD END** without guidance |
| Single import lineage visible? | Inspected per-surface | **PARTIAL** |

**PROVEN BY R4:** End-to-end state machine R2M5 on production UI; broker/trucker portals; unknown≠0; no margin leakage on customer paths.

**NOT PROVEN BY R4:** Self-service initiation; GTM-aligned dashboard; customs/freight as revenue entry points; unified import object UX; Turkish-first product.

---

## Gap prioritization (journey-derived)

| ID | Gap | Tier | Journey |
|----|-----|------|---------|
| J-A1 | Dashboard sourcing-first hero/CTAs | T0 | A |
| J-A2 | Freight request deposit / ops create | T1 | A |
| J-B1 | No customs service initiation CTA | T0 | B |
| J-B2 | Customs not in buyer nav | T1 | B |
| J-C1 | No PO→POD single import view | T1 | C |
| J-C2 | Landed Cost not in nav / not in shipment WS | T1 | C |
| J-C3 | Inland not in nav | T2 | C |
| J-D1 | Direct PO not promoted on home | T2 | A/C |

See main audit for full T0–T4 list and remediation scope estimates.
