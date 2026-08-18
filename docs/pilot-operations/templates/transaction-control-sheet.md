# DeMaxtore Turkey Paid Pilot — Transaction Control Sheet

**Use:** One row per active pilot transaction. Update at least daily (or on every stage change).  
**Ops must always answer:** (1) Where is it now? (2) Whose action is next?

Copy the blank row below for each customer/transaction. Keep this file or a working copy in ops workspace.

**Templates folder:** [`README.md`](README.md)

---

## Active transactions

| Customer | PO | Shipment | Container | ETA | Customs status | Broker | Inland status | Trucker | POD | Landed cost | Open issues | Next action | Owner | Last updated |
|----------|----|----------|-----------|-----|----------------|--------|---------------|---------|-----|-------------|-------------|-------------|-------|--------------|
| | | | | | | | | | | | | | | |

---

## Blank row (copy/paste)

```
| Customer | PO | Shipment | Container | ETA | Customs status | Broker | Inland status | Trucker | POD | Landed cost | Open issues | Next action | Owner | Last updated |
|----------|----|----------|-----------|-----|----------------|--------|---------------|---------|-----|-------------|-------------|-------------|-------|--------------|
|          |    |          |           |     |                |        |               |         |     |             |             |             |       |              |
```

---

## Field guide

| Field | What to record |
|-------|----------------|
| **Customer** | Company / pilot customer name |
| **PO** | PO number (e.g. `PO-MST…`) |
| **Shipment** | Shipment ref or workspace id (human-readable ref preferred) |
| **Container** | Container number or “—” |
| **ETA** | Maritime/booking ETA relevant to buyer question |
| **Customs status** | e.g. DRAFT, IN_REVIEW, CLEARED |
| **Broker** | Assigned broker (name/email) |
| **Inland status** | e.g. REQUESTED, TRUCKER ASSIGNED, DELIVERED |
| **Trucker** | Assigned trucker |
| **POD** | PENDING / UPLOADED / — |
| **Landed cost** | NOT STARTED / INCOMPLETE / VIEWED / — |
| **Open issues** | Blockers, missing docs, waiting-on |
| **Next action** | One concrete step (verb + object) |
| **Owner** | Buyer / DeMaxtore Ops / Broker / Trucker |
| **Last updated** | Date + time (UTC or local, be consistent) |

---

## Stage quick reference (lineage)

Product → PO → Freight → Booking → Shipment → Allocation → Tracking → Customs → CLEARED → Inland → DELIVERED → POD → Landed Cost

**CLEARED ≠ DELIVERED**

---

## Completion checklist (per transaction)

Mark when evidenced on same lineage:

- [ ] PO live
- [ ] Booking confirmed
- [ ] Shipment + container
- [ ] Line allocation done
- [ ] Customs CLEARED
- [ ] Inland DELIVERED
- [ ] POD attached
- [ ] Landed cost reviewed (`/buyer/landed-cost`)

Transaction **complete** only when all checked.
