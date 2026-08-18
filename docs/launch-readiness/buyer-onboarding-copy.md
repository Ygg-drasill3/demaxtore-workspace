# Buyer Onboarding — Copy Reference

In-app source: `apps/frontend/src/content/launch-copy.ts` → `BUYER_ONBOARDING`

---

## Dashboard hero (first trade mode)

**Subtitle:**  
We'll walk you through RFQ → award → PO → shipment in one auditable workspace.

**Standard / power mode:**  
Operational overview — what needs attention, what's moving, what's next.

---

## Onboarding section (collapsible panel)

**Section title:** Your first import trade

**Subtitle — new buyer:**  
We'll walk you through RFQ → award → PO → shipment in one auditable workspace.

**Subtitle — experienced buyer:**  
Guided checklist — expand when onboarding a new category or team member.

### Welcome card

**Title:** Welcome to your sourcing command center

**Body:**  
DeMaxtore replaces email threads and spreadsheets with structured RFQs, sealed CommodityBid auctions, and container programmes — all tied to purchase orders and live shipment tracking.

**CTAs:**
- Primary: Create your first RFQ → `/buyer/rfq/new`
- Secondary: Open Learning Center → `/learning`

---

## Checklist steps (guided onboarding card)

| Step | Label | Hint (tooltips / help drawer) |
|------|-------|-------------------------------|
| 1 | Create RFQ | Define products, quantities, and incoterms in a workspace. |
| 2 | Receive quotations | Invited suppliers submit comparable bids in one place. |
| 3 | Award supplier | Compare price, lead time, and terms with a full audit trail. |
| 4 | Issue purchase order | PO spawns automatically — no re-keying into ERP. |
| 5 | Track shipment | Freight selection links to maritime tracking and exceptions. |
| 6 | Close the trade | Documents approved, delivery confirmed, trade archived. |

---

## Empty states (buyer lists)

| Screen | Title | Body |
|--------|-------|------|
| RFQ list | No RFQs yet | Create your first sourcing request to start collecting supplier quotations. |
| PO list | No purchase orders yet | POs are issued after you award an RFQ or approve a CommodityBid winner. |
| Shipments | No shipments yet | Shipments appear after you select a freight offer on an order. |
| CommodityBid | No commodity bids yet | Run a sealed-bid reverse auction to collect competitive lot pricing. |

---

## Email templates (invite — manual today)

**Subject:** You've been invited to DeMaxtore — ABC Foods sourcing workspace

**Body:**
> Hi {name},  
>  
> {buyer_org} uses DeMaxtore to run import sourcing and execution. Your account is ready.  
>  
> Sign in: {app_url}/login  
> Email: {user_email}  
> Temporary password: (provided separately)  
>  
> Start with the Learning Center or create your first RFQ from the buyer dashboard.  
>  
> — DeMaxtore Team

---

## Success criteria (buyer onboarding complete)

- [ ] First RFQ submitted  
- [ ] At least one quotation received OR CommodityBid auction scheduled  
- [ ] First PO issued  
- [ ] User visited Learning Center once  
- [ ] Optional: first shipment tracked

Tracked in admin `/onboarding` dashboard and CSV exports.
