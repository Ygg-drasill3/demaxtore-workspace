# First Customer Playbook — DeMaxtore

**Audience:** Ops, CS, first pilot buyer/supplier  
**Last verified:** 2026-06-18

---

## Pre-flight (ops)

Before first real customer login:

- [ ] PM2 `demaxtore-backend` online (`docs/operations/pm2-production-runbook.md`)
- [ ] `/api/healthz` and `/api/ready` return OK
- [ ] `PAYMENT_WEBHOOK_SECRET` and `CARRIER_WEBHOOK_SECRET` set
- [ ] Backup cron scheduled
- [ ] Admin account verified: `admin@demaxtore.local` (or production admin)
- [ ] Demo seed **not** used for production tenant data

---

## 1. Buyer onboarding

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 1.1 | Admin | Create buyer org + user (or invite flow) | User can log in |
| 1.2 | Buyer | Log in → lands on buyer dashboard | No 403/500 |
| 1.3 | Buyer | Complete onboarding tour (if shown) | Progress saved |
| 1.4 | Admin | Confirm buyer sees own tenant data only | Cross-tenant 403 |

**Demo accounts (sandbox only):** `buyer1@acme.test` / `Passw0rd!`

---

## 2. Supplier onboarding

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 2.1 | Admin | Register supplier org + supplier user | Supplier email unique |
| 2.2 | Admin | Link supplier to product categories / RFQ pool | Appears in assign-suppliers list |
| 2.3 | Supplier | Log in → supplier dashboard | Quote form accessible |
| 2.4 | Admin | Confirm supplier cannot see other tenants' RFQs | Isolation |

**Demo accounts:** `supplier1@acme-mfg.test` / `Passw0rd!`

---

## 3. RFQ creation

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 3.1 | Buyer | Create RFQ (title, category, line items, deadline) | Draft saved |
| 3.2 | Buyer | Submit RFQ | State → submitted / open |
| 3.3 | Buyer | Set procurement strategy (Direct RFQ if required) | Strategy gate passes |
| 3.4 | Admin | Assign supplier(s) | Supplier notified (toast/socket) |
| 3.5 | Admin | Publish RFQ | Supplier sees quote form |

**Blockers:** Missing `productCategory`, `lineItems`, `deadlineAt` → validation error.

---

## 4. Offer (quotation) flow

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 4.1 | Supplier | Open RFQ workspace | Quote form visible |
| 4.2 | Supplier | Enter unit price, lead time, payment terms | Submit |
| 4.3 | Supplier | Quotation status → SUBMITTED | Badge updates |
| 4.4 | Buyer | View quotations list | Sees supplier quote |
| 4.5 | Buyer | Close quotations → start evaluation | FSM transition OK |

---

## 5. PO flow

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 5.1 | Buyer/Admin | Select supplier (quotation) | Selection recorded |
| 5.2 | Buyer | Request proforma | Supplier notified |
| 5.3 | Supplier | Upload proforma PDF | Attachment stored |
| 5.4 | Buyer | Approve proforma | State → proforma approved |
| 5.5 | Buyer/Admin | Issue PO | Order spawned |

**Verify:** `GET /api/rfq/:id/spawned-orders` returns order ID.

---

## 6. Order flow

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 6.1 | Supplier | Confirm order | ORDER_CREATED → confirmed |
| 6.2 | Supplier | Start production | Production timeline updates |
| 6.3 | Supplier | Complete production | Ready for inspection/freight |
| 6.4 | Buyer | Request inspection OR skip | Per incoterm/process |
| 6.5 | Admin | Complete inspection (if requested) | Inspection report uploaded |
| 6.6 | Buyer | Request freight / proceed to freight | FREIGHT_REQUESTED |

**Stuck order:** Check Exception Hub + Control Tower for open alerts.

---

## 7. Shipment flow

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 7.1 | Admin/Ops | FreightIQ select offer OR book shipment | Shipment spawned |
| 7.2 | Admin | Confirm booking (two-step if required) | BOOKING_CONFIRMED |
| 7.3 | Admin | Assign container → load vessel → depart | IN_TRANSIT |
| 7.4 | Admin | Update ETA / mark arrived | Port milestones |
| 7.5 | Admin | Customs start → complete | Customs cleared |
| 7.6 | Buyer | Confirm delivery | DELIVERED |

**Verify:** Order and shipment states aligned (no desync alerts).

---

## 8. Payment flow

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 8.1 | System | Payment intent / milestone created | Visible on order |
| 8.2 | Provider | Send webhook with valid HMAC | `200 {"received":true}` |
| 8.3 | Provider | Retry same eventId | `200 {"duplicate":true}` |
| 8.4 | Ops | Monitor disputed webhooks | Order hold + DISPUTED state |

**Secrets required:** `PAYMENT_WEBHOOK_SECRET` in backend `.env`.

---

## 9. Documents (trade + document center)

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 9.1 | Supplier/Admin | Upload required trade docs | Compliance NOT_READY → progress |
| 9.2 | Admin | Review / approve documents | Compliance READY |
| 9.3 | Admin | Reject document (if needed) | Control Tower `trade_doc_rejected` alert |
| 9.4 | Buyer | Document center access | Own tenant docs only |
| 9.5 | Other tenant | Attempt cross-access | `403 FORBIDDEN` |

---

## 10. Order close

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 10.1 | Buyer | Confirm delivery (if not done) | Shipment DELIVERED |
| 10.2 | Buyer | Close order with settlement note | State → CLOSED |
| 10.3 | Admin | Verify Control Tower clear | No blocking exceptions |

---

## First customer go/no-go

| Check | Pass criteria |
|-------|---------------|
| End-to-end pilot trade | RFQ → CLOSED without manual DB edits |
| Tenant isolation | Cross-tenant 403 on order + documents |
| Webhooks | Valid HMAC accepted; duplicate idempotent |
| Health | healthz + ready OK for 24h |
| Support contact | Named ops owner for pilot |

---

## Escalation

See `docs/operations/incident-response-runbook.md` for payment, carrier, DB, stuck shipment/order procedures.
