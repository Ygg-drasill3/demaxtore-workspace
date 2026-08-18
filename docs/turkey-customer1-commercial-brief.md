# Turkey Customer #1 — Internal Commercial Brief

**Classification:** INTERNAL — not for customer distribution  
**Version:** v1.0  
**Date:** 2026-08-15  
**Status:** Active — pre–Customer #1 outreach  

**Related (internal ops):**

- Launch gate: [`turkey-mvp-final-launch-go-no-go.md`](turkey-mvp-final-launch-go-no-go.md)
- Operations playbook: [`turkey-paid-pilot-day0-customer1-operations-playbook.md`](turkey-paid-pilot-day0-customer1-operations-playbook.md)
- Ops templates: [`pilot-operations/templates/`](pilot-operations/templates/)

**Customer-facing materials:** Separate. Do **not** paste this document to prospects. A future one-page **DeMaxtore Managed Import Pilot** offer will be derived from §4–5 here, without internal risk registers.

**Development cut:** MAINTAIN. No Sprint 43, no remediation, no “while we’re here” product work until Customer #1 evidence exists.

---

## 1. Strategic shift

### What we stop selling

- “Can we demo our platform?”
- “Self-service import SaaS”
- “Fully automated customs / official tax liability”
- Generic RFQ / CommodityBid / sourcing-OS narrative (wrong front door for Turkey Customer #1)

### What we sell now

> **Manage your next import with DeMaxtore.**

One real import transaction, end to end, on the proven workspace — with DeMaxtore Operations, broker, and trucker coordination where the product requires assisted handoffs.

**Future customer-facing headline (draft — not this doc):**

> Bir sonraki ithalatınızı DeMaxtore ile yönetin.  
> Satın alma siparişinden navlun ve sevkiyata, gümrük koordinasyonundan yurtiçi teslimata ve landed cost görünürlüğüne kadar tek bir ithalat işlemini DeMaxtore workspace ve operasyon ekibi üzerinden uçtan uca takip ediyoruz.

### What is already proven (internal confidence — cite evidence, don’t oversell)

| Claim | Evidence |
|-------|----------|
| Same-transaction import chain UI-only | Phase 17 R4 (`MVP-UI17-R4-20260814-R2M5`) |
| Tenant isolation | Phase 12 |
| DB + uploads recovery | Phase 15 + 15A |
| Controlled pilot feasible (max 5) | GO/NO-GO + R4 capacity |
| Self-service end-to-end | **NOT READY** — do not promise |

---

## 2. Three-part commercial work (sequence)

Complete in order. Do not skip to outreach without §2.1–2.3 alignment.

| Part | Question | This document |
|------|----------|---------------|
| **A** | Customer #1 ICP — who, who not | §3 |
| **B** | What we sell — scope in / out | §4 |
| **C** | How we make money — model, not fantasy price | §5 |
| **D** | Execute | §6–8 — 3–5 candidates → outreach → close |

After Customer #1 is live, measure only: **transaction completion**, **Ops minutes**, **customer support friction** (see [`pilot-operations/templates/friction-log.md`](pilot-operations/templates/friction-log.md)). Sprint 43 scope comes from that data, not assumptions.

---

## 3. Customer #1 ICP

### 3.1 Ideal profile (prioritize)

| Dimension | Prefer |
|-----------|--------|
| Market | Turkey **importer** (buyer org) |
| Lane | Single origin → Turkey (e.g. China → TR) — **one container first** |
| Mode | Ocean FCL, **single container**, few SKUs |
| Supply | **Existing supplier** — Direct PO path (no RFQ/CommodityBid required) |
| Partners | Willing to use assigned **customs broker** + **trucker** (existing relationship or pilot partners) |
| Champion | Import / supply chain / operations lead — **not IT-first** |
| Pain | Email/WhatsApp chaos; “where is cargo / customs / delivery / cost?” scattered |
| Complexity | **Low** for first job — no split/consolidation, no multi-supplier first transaction |

### 3.2 Disqualifiers (Customer #1 — do not force)

| Disqualifier | Why |
|--------------|-----|
| Expects full self-service | Product NOT READY; broken promise |
| Expects official duty/tax liability or BİLGE | Out of scope; legal/commercial risk |
| First transaction intentionally complex (multi-container, multi-supplier, split) | Ops learning goal fails |
| No broker/trucker path in 2–4 weeks | Chain stalls at customs/inland |
| Demands 10+ users / 10-customer scale day one | Capacity NO per R4 |
| Champion is IT-only, no import operator | Wrong buyer for assisted pilot |
| Unwilling to accept assisted Ops handoffs on freight/deposit | Core friction becomes conflict |

### 3.3 Selection scorecard (internal — rank candidates)

Score each candidate **1–5** (5 = best). Customer #1 should lead on **simplicity + partner readiness + champion access**.

| Criterion | Weight |
|-----------|--------|
| Single-container, simple SKU first job | High |
| Existing supplier + Direct PO fit | High |
| Broker + trucker available (named) | High |
| Champion engaged, decision in ≤4 weeks | High |
| Real pain (visibility, coordination) | Medium |
| Forwarding/commercial fit (see §5) | Medium |
| Brand/reference value | Low for #1 (learning > logo) |

**Rule:** Customer #1 alone first. #2–#3 only after #1 progresses without P0 (playbook ramp).

### 3.4 Where to find candidates (channels)

1. **Warm network** — known importers, forwarder/broker introductions (fastest)
2. **Pilot broker/trucker partners** — “joint pilot customer” (aligns with Partner Workspace proof)
3. **Narrow sector outreach** — food / ingredients / similar to proven R4 profile (operational familiarity)
4. **Problem-led conversation** — not product demo: *“Bir sonraki konteynerinizi birlikte yönetelim”*

Avoid: broad RFQ-led demo funnel, enterprise RFP, “platform evaluation” procurement.

---

## 4. What we sell (Managed Import Pilot — internal scope)

### 4.1 Product shape (customer language — for future one-pager)

**Name (working):** DeMaxtore Managed Import Pilot  

**One-line:** We manage **one import transaction** with you on DeMaxtore — PO through landed cost visibility — with our operations team on the assisted steps.

### 4.2 Included (contractual scope — draft for legal/CS later)

| Included | Notes |
|----------|-------|
| Buyer workspace access | Product Master, Direct PO, order/shipment/customs/inland visibility |
| DeMaxtore Ops on assisted steps | Freight/deposit handoff, booking, allocation, partner assignment — **production UI only** |
| Partner workspace | Assigned customs broker + trucker on **one shipment** |
| One completed import transaction | Target: PO → … → POD → landed cost review on same lineage |
| Business-hours coordination channel | Defined before kickoff (not 24/7 SLA) |
| Pilot period | **Completion-based** primary; outer time box as backstop only |

### 4.3 Explicitly excluded (say no early)

| Excluded | Customer-safe wording (future) |
|----------|----------------------------------|
| Self-service end-to-end | “Pilot is co-managed; some steps run with DeMaxtore Ops” |
| Official tax/customs liability | “Duty & tax figures are estimates, not government liability” |
| BİLGE / government integration | Not offered |
| Unlimited users / tenants | Pilot is scoped |
| ERP integration | Out of pilot |
| 24/7 SLA | Not offered unless separately contracted |
| More than 5 simultaneous pilot customers | Capacity cap — internal only |

### 4.4 Commercial claims we allow

- Single-workspace visibility across PO, shipment, customs, inland, POD, landed cost **estimate**
- Broker and trucker collaboration on assigned work
- Audit trail / same-transaction lineage
- Coordinated import execution with DeMaxtore Ops

### 4.5 Commercial claims we forbid

- “Fully automated import”
- “Official gümrük vergi borcu”
- “Self-service platform — sign up and run alone”
- “Carrier API / predictive ETA guarantee”
- “Enterprise disaster recovery / off-host backup guarantee” (internal P1 — §7)

---

## 5. How we make money (model — no fixed price in this doc)

### 5.1 Pricing model for Customer #1

**Selected model:** **Single transaction pilot fee** (one fee for one managed import through completion).

Do **not** publish a theoretical list price in this brief. Set the **number** only when a **specific candidate** is scoped, using §5.2.

**Not for Customer #1:**

- Pure SaaS subscription (hides Ops cost; implies self-service)
- Heavy dual pricing (retainer + large per-shipment) unless candidate explicitly needs it

### 5.2 How to set the pilot fee (per candidate)

Work through these **before** quoting:

| Input | Question |
|-------|----------|
| **Container / cargo value** | Rough commercial scale of the job — anchors willingness to pay |
| **Freight economics** | Navlun büyüklüğü; DeMaxtore forwarding geliri bu işten ne kazanıyor? |
| **Forwarding margin already captured** | If meaningful forwarding revenue on the same transaction, **do not stack** a large separate “software fee” — pilot fee can be **modest or zero net** if execution proves the model |
| **Ops load estimate** | Expected handoffs (freight, booking, assign) — sanity-check against friction from R4 |
| **Strategic value** | Reference, sector fit, repeat lane — may justify discount on pilot fee |
| **Customer #1 learning goal** | First deal optimizes **proof + data**, not margin maximization |

**Principle:** Pilot fee + forwarding revenue = **total commercial picture**. Avoid double-charging on the same shipment.

**Internal worksheet (fill per candidate):**

| Field | Candidate A | Candidate B |
|-------|-------------|-------------|
| Est. container/cargo USD | | |
| Est. freight (customer-facing) USD | | |
| DeMaxtore forwarding margin (internal) | | |
| Proposed pilot fee (TRY/USD) | | |
| Ops hours assumed | | |
| Rationale | | |

### 5.3 After Customer #1

Pricing evolves from:

- Actual **Ops minutes** (friction log)
- **Completion rate** and support load
- Whether customer repeats on same lane

Sprint 43 / packaging changes only after **3+ real transactions** of evidence.

---

## 6. Sales conversation — how to run (internal)

### 6.1 Opening (not a demo)

Lead with:

> “Bir sonraki ithalatınızı DeMaxtore ile birlikte yönetmek ister misiniz? Tek konteyner, tek iş — PO’dan teslim ve landed cost görünürlüğüne kadar workspace’te birlikte yürütüyoruz.”

**Not:** “15 dakikalık demo yapalım mı?” as the hook.

### 6.2 Discovery questions (15–20 min)

| Topic | Ask |
|-------|-----|
| Next shipment | Origin, POL/POD, timing, container count, SKUs |
| Today’s pain | Where do emails/Excel break? Customs? Inland? Cost visibility? |
| Partners | Broker and trucker — who, relationship |
| Success | What would “this pilot worked” mean for you in 6 weeks? |
| Constraints | ERP, internal approval, deposit/freight process |
| Expectations | Probe for self-service / official tax — **correct early** |

### 6.3 What to show (only if needed)

Short **evidence tour**, not full RFQ demo:

- Direct PO → shipment visibility → customs → inland → POD → landed cost list  
- Emphasize **same transaction**, **co-managed**, broker/trucker on partner workspace  

Align story to **their** next container, not R4 marker details.

### 6.4 Objection handling (internal)

| Objection | Response direction |
|-----------|-------------------|
| “We have ERP for PO” | Pilot focuses on **import execution gap** after PO — visibility to delivery and cost |
| “We already have a forwarder” | DeMaxtore coordinates **your** import on one workspace; forwarding can be part of our service or aligned with yours — scope in writing |
| “What does it cost?” | Scoped **per your next shipment** after we understand lane and scope — no generic price list |
| “Is duty/tax official?” | **Estimate only** — broker-reviewed operational figures, not government liability |
| “Can we do it ourselves?” | Partially — buyer steps yes; freight intake and some handoffs are **co-managed in pilot** |

### 6.5 Close to pilot

Exit criteria for verbal yes:

- Named **next shipment** (or realistic window)
- Named **broker + trucker** (or agreement to use pilot partners)
- Champion + Ops contact
- Accept assisted model + estimate semantics
- Internal sign-off on **pilot fee** (§5.2 worksheet)

Then: Day-0 checklist, accounts, control sheet — not engineering.

---

## 7. Internal risks (do not put in customer offer raw)

These inform **whether** we onboard and **how** we contract — not fear-mongering in sales deck.

| Risk | Status | Customer-facing handling |
|------|--------|---------------------------|
| Off-host backup absent | **ACCEPTED P1** | Do not mention host-loss scenario; contract may reference business-hours recovery effort, not DR SLA |
| Self-service NOT READY | Open product reality | Co-managed pilot wording |
| Ops handoffs on freight/deposit | Accepted friction | Set expectation in kickoff |
| Duty/tax estimate only | By design | Written exclusion of official liability |
| Max 5 pilot customers | Capacity | Internal queue only |
| Backup stale >26h / 2 fail | Stop onboarding | Internal ops gate |

Full register: GO/NO-GO §27, §34, playbook stop conditions.

---

## 8. Next actions (commercial team)

| # | Action | Owner | Done |
|---|--------|-------|------|
| 1 | Align on §5.2 worksheet for pricing logic | Commercial + forwarding | ☐ |
| 2 | Build list of **3–5 real candidates** (§3.3 scorecard) | Sales / founders | ☐ |
| 3 | Rank #1 candidate; confirm broker/trucker path | Ops + commercial | ☐ |
| 4 | First outreach — problem-led, not demo-led | Sales | ☐ |
| 5 | Draft **customer-facing** one-page Managed Import Pilot (separate doc) after #1 candidate scoped | Commercial | ☐ |
| 6 | Legal/service scope from §4.2–4.3 when verbal yes | Legal/ops | ☐ |

**Do not:** open Sprint 43, change product, or publish a public price before step 2–3.

---

## 9. Document map

| Document | Audience | Purpose |
|----------|----------|---------|
| **This file** | Internal | ICP, pricing logic, sales motion, internal risks |
| `turkey-paid-pilot-day0-customer1-operations-playbook.md` | Internal ops | Run the transaction |
| `pilot-operations/templates/*` | Internal ops | Day-0, control sheet, friction log |
| `turkey-mvp-final-launch-go-no-go.md` | Internal | Launch gate evidence |
| **Future:** `turkey-managed-import-pilot-offer.md` (or PDF) | **Customer** | One-page pilot proposal — no internal P1 raw |

---

## 10. Success definition (commercial + ops)

Customer #1 commercial success is **not** “they logged in.”

It is:

1. **Paid pilot agreed** on scoped single transaction  
2. **Transaction completed** on proven chain (control sheet completion checklist)  
3. **Ops minutes and friction logged** — input to forwarding + software packaging  
4. **Customer would refer or repeat** — or clear articulated reason they would not  

Only then: Customer #2, pricing refinement, customer-facing offer hardening, eventual Sprint 43 candidacy from friction data.
