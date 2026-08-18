# Supplier Onboarding — Copy Reference

In-app source: `apps/frontend/src/content/launch-copy.ts` → `SUPPLIER_ONBOARDING`

---

## Dashboard context

Suppliers land on `/supplier/dashboard` after login. No self-registration — buyer or DeMaxtore admin invites via RFQ / CommodityBid assignment.

---

## Onboarding section (collapsible panel)

**Section title:** Supplier workspace guide

**Subtitle — new supplier:**  
You've been invited to quote — here's how to win and execute on DeMaxtore.

**Subtitle — active supplier:**  
Quick reference for invitations, PO acknowledgement, and document uploads.

### Welcome card

**Title:** Respond faster. Execute with clarity.

**Body:**  
Buyers run structured RFQs and sealed auctions on DeMaxtore. You see only workspaces you're invited to — submit quotations, acknowledge POs, and upload compliance documents in one hub.

**CTAs:**
- Primary: View open opportunities → `/supplier/rfq`
- Secondary: Supplier learning guides → `/learning`

---

## Checklist steps

| Step | Label | Hint |
|------|-------|------|
| 1 | Receive invitation | RFQ or CommodityBid invite appears in your dashboard. |
| 2 | Submit your offer | Quote line items or bid lots before the deadline. |
| 3 | Acknowledge PO | Confirm acceptance or flag issues within SLA. |
| 4 | Upload documents | Proforma, certificates, and shipping docs per checklist. |
| 5 | Complete shipment | Coordinate production and hand-off to freight. |

---

## Empty states (supplier lists)

| Screen | Title | Body |
|--------|-------|------|
| RFQ list | No RFQs yet | RFQs appear when a buyer invites your organisation to quote. |
| PO list | No purchase orders yet | POs appear when a buyer awards you an RFQ or CommodityBid. |
| Shipments | No shipments yet | Shipments are created when freight is booked on an order linked to your POs. |

---

## First-invite email (manual today)

**Subject:** New sourcing invitation on DeMaxtore — {buyer_name}

**Body:**
> Hi {supplier_contact},  
>  
> {buyer_name} has invited {supplier_org} to participate in a sourcing workspace on DeMaxtore.  
>  
> Sign in: {app_url}/login  
> Email: {user_email}  
>  
> Open your dashboard to view the RFQ or auction details and submit your offer before the deadline.  
>  
> — DeMaxtore

---

## Supplier do's and don'ts (for sales / CS)

| Do | Don't |
|----|-------|
| Acknowledge PO within 48h | Quote in email outside the workspace |
| Upload documents to the checklist | Send PDFs only via WhatsApp |
| Use revise bid only before deadline | Share bidder codes with other suppliers |
| Flag issues via PO rejection flow | Ignore amendment requests |

---

## Success criteria (supplier onboarding complete)

- [ ] First invitation viewed  
- [ ] First quotation or bid submitted  
- [ ] First PO acknowledged  
- [ ] First document uploaded  
- [ ] Optional: shipment milestone reached
