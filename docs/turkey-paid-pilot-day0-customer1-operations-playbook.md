# DeMaxtore Turkey — Paid Pilot Day-0 & Customer #1 Operations Playbook

**Version:** v1.0  
**Pilot model:** Controlled Paid Pilot  
**Initial capacity:** Customer #1 → staged ramp to maximum 5 customers  
**Self-service:** NOT READY  
**Development cut:** ACTIVE — Sprint 43 does not start  
**Operating model:** Buyer + DeMaxtore Ops + Customs Broker + Trucker  
**Engineering role:** Not a normal Golden Path actor; incident/P0 only  

**Related launch gate:** [`docs/turkey-mvp-final-launch-go-no-go.md`](turkey-mvp-final-launch-go-no-go.md)  
**Internal commercial brief (ICP, pricing logic, sales motion):** [`docs/turkey-customer1-commercial-brief.md`](turkey-customer1-commercial-brief.md) — not customer-facing

**Daily ops templates (print / copy):**

| Template | Path |
|----------|------|
| Day-0 checklist | [`docs/pilot-operations/templates/day0-checklist.md`](pilot-operations/templates/day0-checklist.md) |
| Transaction control sheet | [`docs/pilot-operations/templates/transaction-control-sheet.md`](pilot-operations/templates/transaction-control-sheet.md) |
| Friction log | [`docs/pilot-operations/templates/friction-log.md`](pilot-operations/templates/friction-log.md) |

Use this playbook as **reference**. Use the templates for **daily execution**.

---

## 1. Pilot purpose

Customer #1 is not only “can the customer log in?”

We must prove:

> A real Turkey importer can manage a real import on DeMaxtore, and the DeMaxtore team can sustain it operationally **without developer intervention**.

**Pilot chain:**

Product → PO → Freight → Booking → Shipment → Container → Tracking → Customs → Broker → Duty & Tax → CLEARED → Inland → Trucker → Delivered → POD → Landed Cost

Until Customer #1 completes, success is **not** new feature count. It is:

- transaction completion
- customer friction
- ops workload
- data integrity

---

# DAY-0 — BEFORE CUSTOMER #1 ONBOARDING

## 2. Technical launch checklist

Run the same day, before Customer #1 is onboarded.

### Production

| Check | Required |
|-------|----------|
| `/api/healthz` | PASS |
| `/api/ready` | PASS |
| DB | up |
| Redis | up |
| Storage | up |
| Backend | active |
| Frontend | reachable |
| Buyer login | PASS |
| Broker login | PASS |
| Trucker login | PASS |

### Backup

| Check | Required |
|-------|----------|
| Latest **complete** backup | SUCCESS |
| DB artifact | present |
| Upload artifact | present |
| Backup age | **< 26 hours** |
| `./scripts/backup-status.sh` | FRESH / healthy |
| Latest set | not partial |
| Recent backup failure log | none (except known test runs) |

### Security

| Check | Required |
|-------|----------|
| Open P0 | **0** |
| Known tenant-isolation regression | none |
| Production E2E/test mutation routes | closed |
| Credential / rate-limit protections | active |

### STOP — do not start Customer #1 if any of:

- backup **> 26 hours** stale
- **two consecutive** unattended backup failures
- DB / Redis / storage readiness fail
- cross-tenant or security incident
- internal margin exposure
- any open **P0**

---

## 3. Customer #1 profile (who to pick)

First customer should be **operationally manageable**.

**Prefer:**

- Turkey importer with an **existing supplier**
- First transaction ideally:
  - Direct PO
  - Single supplier
  - China → Turkey
  - Ocean FCL
  - Single container
  - Few SKUs
  - Single delivery warehouse
  - Single customs broker
  - Single trucker
  - No complex split/consolidation

Do **not** pick the hardest import file for the first pilot. Goal: validate the operating model on real trade.

---

## 4. Pilot scope — what to tell the customer

Do **not** sell “fully automated import platform.”

**Correct frame:**

DeMaxtore coordinates import operations on **one transaction** end to end.

**Primary customer value:**

- purchase / PO tracking
- freight coordination
- booking / shipment visibility
- customs preparation
- broker collaboration
- inland delivery
- POD
- landed-cost visibility

**Do not promise:**

| Wrong claim | Truth |
|-------------|-------|
| Duty & Tax = official tax liability | Estimate engine only |
| DeMaxtore is connected to BİLGE | Not integrated |
| Customs CLEARED = broker-recorded operational status | Not automatic government clearance proof |
| Predictive ETA / carrier EDI/API | Not guaranteed |
| Self-service end-to-end | NOT READY — assisted pilot |

---

# CUSTOMER ONBOARDING

## 5. Minimum information from Customer #1

### Company

- Company name
- Tax/company data per existing onboarding standard
- Buyer users
- Delivery warehouse / location

### Supplier

- Existing supplier
- Supplier company
- Supplier contact if required
- Origin country

### Product (per SKU where possible)

- SKU
- Product name
- Customs description
- Country of origin
- GTİP if known
- Quantity / unit context

If GTİP is missing or unverified: remain **CANDIDATE / UNCLASSIFIED**. System does **not** auto-become VERIFIED.

### Shipment

- Incoterm
- Cargo-ready information
- POL / POD
- Shipment mode
- Container expectation
- Delivery location

### Partners

- Customs Broker
- Trucker

Both Partner Workspace accounts should be ready **before** pilot start when possible.

---

# CUSTOMER #1 GOLDEN OPERATION

## 6. Stage 1 — Product

**Owner:** Buyer

Buyer creates or selects product in Product Master.

**Checks:** SKU, origin, customs description, GTİP state, no duplicate Product.

**DeMaxtore Ops:** No intervention unless needed.

---

## 7. Stage 2 — Purchase Order

**Owner:** Buyer

Buyer creates Direct PO.

**Checks:** supplier, Product, PO quantity, unit price, currency, destination, commercial snapshot.

If buyer already knows supplier: **RFQ / CommodityBid not required.** This is the Turkey Direct PO Golden Path.

---

## 8. Stage 3 — PO → Freight handoff

**Owner:** Buyer + DeMaxtore Ops

**Accepted pilot friction** — not self-service.

After PO creation, DeMaxtore Ops runs freight/deposit handoff via **supported production UI**.

### DeMaxtore Ops checks

- PO ready?
- Shipment/freight info sufficient?
- Deposit/business gate recorded if required?
- Freight Request creatable?

### Forbidden for Ops

- No DB changes
- No Prisma
- No UUID handoff to customer/partners
- No curl/API to advance transaction

**Production UI only.**

---

## 9. Stage 4 — Freight Request & Offer

**Owner:** DeMaxtore Ops

Ops prepares freight request; offers entered/published.

Buyer sees **customer-facing commercial price only**.

Buyer must **never** see: carrier buy rate, DeMaxtore margin, internal spread, confidential procurement economics.

Buyer selects offer.

---

## 10. Stage 5 — Booking

**Owner:** DeMaxtore Ops

**Canonical lifecycle:** DRAFT → REQUESTED → PENDING → CONFIRMED

Ops records via UI: carrier, booking number, booking ETA, cut-offs, required booking fields.

**Check:** Booking ETA ≠ Maritime ETA (semantics differ; values may coincidentally match).

---

## 11. Stage 6 — Shipment & Container

**Owner:** DeMaxtore Ops

Shipment from existing lineage.

**Checks:**

- PO → Freight → Booking → Shipment lineage intact
- Container entered
- Container visible on Shipment
- Consistent with Related Entities and Tracking
- Canonical container collection not empty

---

## 12. Stage 7 — Line Allocation

**Owner:** DeMaxtore Ops

From Shipment Workspace: allocate PO line to shipment.

**UI:** select PO → PO line → ordered / allocated / remaining qty → allocation qty; attach container if required.

**Checks:**

- allocated qty ≤ remaining PO-line qty
- over-allocation rejected

**Why critical:** feeds Goods Cost → Landed Cost. Wrong allocation = wrong landed cost.

---

## 13. Stage 8 — Tracking

**Owner:** Ops / Buyer visibility

**Checks:** shipment, container, booking status, milestones, booking ETA, maritime ETA.

Buyer must answer: *“Where is my cargo and what happens next?”*

---

# TURKEY CUSTOMS

## 14. Stage 9 — Start Customs

**Owner:** Buyer / Ops

Turkey-eligible shipment: CustomsCase started/visible. Pre-arrival customs ready.

**Checks:** ETA, readiness, Product/origin, GTİP, broker, required documents.

---

## 15. Stage 10 — Customs Broker assignment

**Owner:** DeMaxtore Ops

Broker assigned. Broker discovers work via **Partner Workspace → My Customs Cases**.

Ops does **not** send UUID, DB ID, or secret links. Normal login only.

---

## 16. Stage 11 — Broker execution

**Owner:** Customs Broker

Broker runs: Start Review → GTİP review/verification → missing doc requests → declaration prep → external declaration → processing → clearance.

**GTİP safety:** CANDIDATE does not self-become VERIFIED. Provenance: **CUSTOMS_BROKER_VERIFIED** (or equivalent).

---

## 17. Stage 12 — Document readiness

**Owner:** Buyer / Broker / Ops

Missing docs visible to buyer. Documents on Trade Documents, correct shipment/case.

**Checks:** no wrong-shipment documents, no tenant leak, broker sees only authorized docs.

---

## 18. Stage 13 — Duty & Tax

**Owner:** Broker / Ops

Presented clearly as **Estimated**. Unsupported measures: **NOT_EVALUATED**. Never auto **0**.

**Forbidden claim:** “This is Turkey Customs’ official tax liability.”

---

## 19. Stage 14 — Customs Cleared

**Owner:** Broker

External declaration processed; broker records operational clearance.

**Canonical status:** CLEARED

**Critical:** **CLEARED ≠ DELIVERED.** Clearance is not customer delivery.

---

# INLAND EXECUTION

## 20. Stage 15 — Inland Request

**Owner:** Buyer / Ops

After CLEARED: start Inland Delivery. Customs gate remains server-side — no physical release before clear.

---

## 21. Stage 16 — Trucker assignment

**Owner:** DeMaxtore Ops

Trucker assigned. Trucker finds delivery via **Partner Workspace → My Deliveries**. No UUID from Ops.

---

## 22. Stage 17 — Trucker execution

**Owner:** Trucker

Lifecycle (per current UI semantics):

PICKUP_SCHEDULED → READY_FOR_PICKUP → PICKED_UP → GATE_OUT → IN_TRANSIT → DELIVERED

**Trucker must never see:** Duty/Tax, GTİP, Landed Cost, DeMaxtore margin, FreightIQ buy rate, buyer-wide financials.

---

## 23. Stage 18 — POD

**Owner:** Trucker / Ops

POD via Trade Documents / POD flow.

**Checks:** correct Shipment + InlandDelivery, buyer can see, not duplicate, document isolation preserved.

---

# FINAL FINANCIAL VIEW

## 24. Stage 19 — True Landed Cost

**Owner:** Buyer (+ DeMaxtore Ops visibility)

Buyer uses **`/buyer/landed-cost`** (shipment panel may not mount TLC — guide customer to list).

Components where applicable: Goods, Freight, Insurance, Duty, VAT, Brokerage/Local, Inland, other valid **customer** costs.

**Critical:** **Unknown ≠ Zero.** Missing insurance → Not provided. Missing duty/tax → not available / not evaluated.

**Financial protection:** Landed Cost never uses carrier buy rate, DeMaxtore margin, or internal commission automatically.

---

## 25. Customer #1 completion criteria

Transaction complete only with evidence of:

PO · Booking · Shipment · Container · Tracking · Customs CLEARED · Inland DELIVERED · POD · True Landed Cost

**Lineage intact:**

Product → PO → Shipment → Customs → Inland → POD → Landed Cost

---

# DAILY PILOT OPERATIONS

## 26. Every morning (few minutes)

Maintain **[transaction control sheet](pilot-operations/templates/transaction-control-sheet.md)** for each active customer.

### System

- `/api/healthz`
- `/api/ready`
- Redis
- Storage

### Backup

- Latest complete backup
- Backup age
- DB + uploads success
- Stale status (`./scripts/backup-status.sh`)

### Operations

- Customs blockers
- Shipment issues
- Broker pending actions
- Inland/pickup blockers
- Missing POD
- Customer-impacting tasks
- Abnormal 5xx

Goal: control first customers — not build an enterprise NOC.

---

## 27. Backup stop rule

**Pause new customer onboarding** if:

1. Latest complete backup **> 26 hours** stale, **or**
2. **Two consecutive** unattended backup failures

**Accepted pilot P1 — off-host backup absent:**

Backups live on production host. Total host loss can destroy **both** live data and local backup. Not production-grade DR. See GO/NO-GO §27.

---

# INCIDENT RULES

## 28. When to call Engineering

Engineering is **not** a Golden Path actor.

Call Engineering for **P0 / incident** only, e.g.:

- tenant or document leak
- partner unauthorized access
- internal margin leak
- repeated critical 5xx
- customs state corruption
- shipment lineage corruption
- material Landed Cost error
- backup/restore failure
- production unavailable

Engineering does **not** routinely advance customer transactions.

---

## 29. Pilot severity

| Level | Meaning | Action |
|-------|---------|--------|
| **P0** | Pilot stop | Halt new onboarding; incident response |
| **P1** | Operational friction | Customer #1 may continue; measure and log |
| **P2** | Cosmetic / minor | No development during pilot |

**P0 examples:** security leak, wrong customer data, margin exposure, customs release bypass, financial corruption, unrecoverable data, Golden Path dead end requiring DB/API.

**P1 examples:** extra Ops handoff, hard-to-find next action, TLC discoverability, manual coordination.

---

## 30. Pilot friction log

Log every real problem in **[`docs/pilot-operations/templates/friction-log.md`](pilot-operations/templates/friction-log.md)**.

Required fields per entry: **Stage**, **Operator minutes**, **Customer impact**, **Severity** (+ transaction, role, problem, workaround, repeated, engineering).

Example:

> **Stage:** PO → Freight · **Operator min:** 4 · **Customer impact:** Low · **Severity:** P1 · **Engineering:** No

After several customers, this data decides Sprint 43 — not internal guesswork.

---

# CUSTOMER RAMP

## 31. Customer #1

Start **alone**.

Goal: complete first real import transaction.

Measure: operator minutes, support messages, errors, confusing states, missing actions, commercial friction.

---

## 32. Customers #2–#3

Only if Customer #1 progresses without critical P0.

Measure especially: freight Ops load, booking workload, broker coordination, customs readiness, trucker assignment, document chase, TLC work.

---

## 33. Customers #4–#5

Only if first three customers show:

- P0 = 0
- backup healthy
- Ops capacity sufficient
- support load acceptable
- no security incident

---

## 34. Why not Customer #6 immediately?

R4 evidence: **5-customer capacity YES · 10-customer capacity NO.**

Customer #6 is **not** a roadmap decision. Reassess from pilot telemetry first; off-host backup before scaling.

---

# WHAT WE DO NOT DO

## 35. Sprint 43 does not start during pilot

These do **not** open a sprint:

- “This screen could be nicer”
- “Add AI here”
- “Automate this handoff”
- Dashboard polish
- Supplier/carrier scorecards

New development only when justified by:

- real customer blocker
- repeated high Ops cost
- conversion/sales blocker

---

## 36. How Sprint 43 gets defined

From **real customer data**, not fixtures.

Examples:

- Same UI friction on 5/5 shipments → candidate
- One action costs 15 min Ops per shipment → candidate
- Customers always need support at same step → candidate
- Security/data integrity → incident remediation, not feature sprint

---

# APPENDICES

Operational forms live in **`docs/pilot-operations/templates/`** — duplicate or print; do not commit customer PII here unless policy allows.

| Form | Template |
|------|----------|
| Customer #1 Day-0 checklist | [`day0-checklist.md`](pilot-operations/templates/day0-checklist.md) |
| Transaction control sheet | [`transaction-control-sheet.md`](pilot-operations/templates/transaction-control-sheet.md) |
| Friction log | [`friction-log.md`](pilot-operations/templates/friction-log.md) |

---

## Pilot stop conditions

Pause **new** customer onboarding if any occur:

- Cross-tenant data exposure
- Unauthorized partner access
- Internal margin exposure
- Shipment/document IDOR
- Customs release before CLEARED
- Material Landed Cost corruption
- Critical transaction lineage break
- Routine transaction requires DB/API intervention
- Backup > 26h stale
- Two consecutive unattended backup failures
- Recovery mechanism broken
- Persistent customer-impacting 5xx
- Ops capacity cannot safely manage active transactions

Existing customers: start incident response.

---

## Accepted pilot risk — off-host backup

| Item | Status |
|------|--------|
| Unattended DB + uploads backup | PASS (Phase 15A) |
| Restore | PROVEN (Phase 15) |
| RPO | ≤ 24h |
| RTO | ~1–2h operational |
| Off-host replication | **NOT IMPLEMENTED — ACCEPTED P1** |

Total host loss: production + local backup may be lost together. Documented; not production-grade DR.

---

## Final operating principle

Success for Customer #1 is **not**:

> “The customer uses DeMaxtore entirely on their own.”

Success **is**:

> “The customer’s import runs on DeMaxtore end to end; the right person takes the next action through normal UI; developers do not enter the transaction; the customer can see cargo, customs, delivery, and landed cost.”

**First pilot model:**

**Software + DeMaxtore Operations + Broker + Trucker**

The most important input to what comes next is **real customer behavior** — not test fixtures.
