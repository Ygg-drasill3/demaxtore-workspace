# Turkey MVP — Final Pre-Customer Smoke

**Type:** FINAL RELEASE GATE / PRE-CUSTOMER OPERATIONAL SMOKE  
**Priority:** CUSTOMER #1 GO-LIVE  
**Scope:** DeMaxtore Turkey — Controlled Paid Pilot  
**Report date:** 2026-08-17  
**Validator:** Read-only production smoke (no business-state mutation, no product changes)

---

## 1. Executive Summary

This smoke answers one question: **Can we safely onboard Customer #1 NOW using the current production system and operating model already validated?**

**Answer: YES.**

All mandatory production gates pass. R4 final transaction evidence remains accessible read-only. Six pilot roles log in. Phase 17A/B/C navigation seams hold. Tenant/document/partner isolation spot checks pass. Backup is fresh from the real 02:00 unattended schedule. No new P0 blockers were found.

**CUSTOMER #1 TECHNICAL GO-LIVE:**

## GO — CONTROLLED PAID PILOT MAY START

Development validation cut is complete. **Do not start Sprint 43.** The next source of product-development evidence is real Customer #1 usage.

---

## 2. Timestamp / Environment

| Field | Value |
|-------|-------|
| Smoke executed | 2026-08-17 ~08:11 UTC |
| Production UI | `https://workspace.demaxtore.com` |
| Production API | `https://workspace.demaxtore.com/api` |
| Application root | `/var/www/demaxtore/DemaxtoreSolitions-main` |
| R4 marker (read-only) | `MVP-UI17-R4-20260814-R2M5` |
| Constraints honored | No DB/API business mutation · No R4 state change · No code changes |

Repeatable script: `scripts/final-pre-customer-smoke.sh`

---

## 3. Production Health

| Endpoint | Result |
|----------|--------|
| `GET /api/healthz` | `status: ok` |
| `GET /api/ready` | `ready: true` |

**Production Health: PASS**

---

## 4. Dependency Readiness

| Dependency | Status |
|------------|--------|
| db | up |
| redis | up |
| storage | up |
| email | up |
| socketAdapter | up |
| safetyGates | up |

All mandatory dependencies up. Safety gates enabled in production.

**Production Readiness: PASS**  
**Mandatory Dependencies: PASS**

---

## 5. Service Status

| Field | Value |
|-------|-------|
| Unit | `demaxtore-workspace-backend.service` |
| State | **active (running)** |
| Since | 2026-08-17 07:27:06 UTC (~44 min at smoke time) |
| NRestarts | 0 |
| Restart context | Expected post–Phase 16 frontend deploy; no restart loop |

Recent log tail (6h): no repeated crashes, Prisma failures, Redis failures, or 5xx patterns.

**Backend Service: PASS**

---

## 6. Latest Backup

| Field | Value |
|-------|-------|
| Backup ID | `20260817-020001` |
| Started | 2026-08-17T02:00:01+00:00 |
| Completed | 2026-08-17T02:00:19+00:00 |
| Age at smoke | ~6.18h (< 26h threshold) |
| Source | Real unattended cron (02:00 UTC) |
| DB artifact | `dmx.dump` — validation SUCCESS |
| Uploads artifact | `uploads.tar.gz` — validation SUCCESS |
| Manifest status | SUCCESS |
| R4 POD canary | Present in manifest |
| Off-host | `not_configured` (accepted P1) |

Last two unattended 02:00 runs: **SUCCESS** (2026-08-16, 2026-08-17). No consecutive unattended failures.

Known test failure `20260815-080856` (simulated uploads failure) is historical and not part of consecutive unattended schedule failures.

**Latest Unattended Backup: PASS**  
**Backup Freshness <26h: PASS**  
**DB Backup: PASS**  
**Uploads Backup: PASS**  
**Backup False-Success Regression: PASS** — both artifacts present and validated; no DB-only silent failure indication

---

## 7. Disk Capacity

| Location | Usage |
|----------|-------|
| Root `/` | 37% (71G / 193G, 123G avail) |
| Backups `.data/backups` | ~996M |
| Uploads `apps/backend/.data/uploads` | ~130M |

Comfortable headroom for Customer #1 onboarding uploads and next backup cycles.

**Disk Capacity: PASS**

---

## 8. Daily Monitoring Check

Runbook: `docs/pilot-operations/monitoring-runbook.md` — **exists and usable**.

Executed today (2026-08-17):

| Runbook step | Result |
|--------------|--------|
| healthz + ready | PASS |
| Backend service active | PASS |
| backup-status.sh → FRESH | PASS |
| Disk check | PASS |
| Control Tower / ops surface | PASS |

**Manual monitoring acknowledgement:** Automatic human alerting is **not** configured (Phase 14 accepted P1). Customer #1 Ops owner must run this runbook every business morning. This is **manual pilot control**, not automatic monitoring.

**Daily Monitoring Check: PASS**

---

## 9. Six-Role Login Smoke

All roles: login succeeds, home route loads, no blank screen, no redirect loop, no unexpected 5xx during smoke.

| Role | Account (redacted) | Landing | Result |
|------|-------------------|---------|--------|
| BUYER | `buyer1@acme.test` | Buyer workspace | PASS |
| ADMIN / OPS | `admin@demaxtore.local` | `/admin/dashboard` | PASS |
| SUPPLIER | `supplier1@acme-mfg.test` | `/supplier/dashboard` | PASS |
| CUSTOMS BROKER | `broker.smoke@demaxtore.local` | Partner workspace | PASS |
| TRUCKER | `trucker.smoke@demaxtore.local` | Partner workspace | PASS |
| ORIGIN AGENT | `origin.agent.smoke@demaxtore.local` | `/partner` (Partner Workspace) | PASS |

---

## 10. Buyer Navigation

Logged in as Buyer. Existing surfaces reachable (HTTP 200, content rendered):

| Surface | Route | Result |
|---------|-------|--------|
| Product Master | `/buyer/products` | PASS |
| Purchase Orders | `/buyer/purchase-orders` | PASS |
| Shipment (R4) | `/workspace/shipment/{R4-shipment}` | PASS |
| Customs (R4) | `/buyer/customs/{R4-customs}` | PASS |
| Inland (R4) | `/buyer/inland/{R4-inland}` | PASS |
| True Landed Cost (R4) | `/buyer/landed-cost/{R4-lc}` | PASS |
| Trade Documents | `/buyer/trade-documents` | PASS |

No transaction created. No business-state mutation.

---

## 11. Phase 17A Seam Smoke

Regression spot-check on existing R4/read-only data:

| Seam | Result |
|------|--------|
| Product Master routing | PASS |
| Shipment workspace loads | PASS |
| Line Allocation UI (`shipment-line-allocation`) | PASS |
| No UUID requirement | PASS |
| No API workaround required | PASS |

**Phase 17A Seams: PASS**

---

## 12. Phase 17B Broker Smoke

Logged in as Broker smoke account:

| Step | Result |
|------|--------|
| Partner Workspace | PASS |
| My Customs Cases | PASS |
| Assigned R4 case → Open Case | PASS |
| Customs execution surface | PASS |
| No UUID / no direct API / no dead route | PASS |

**Phase 17B Broker Navigation: PASS**

---

## 13. Phase 17C Trucker Smoke

Logged in as Trucker smoke account:

| Step | Result |
|------|--------|
| Partner Workspace | PASS |
| My Deliveries | PASS |
| Assigned R4 delivery → Open Delivery | PASS |
| Inland execution surface | PASS |
| No UUID / no direct API / no dead route | PASS |

**Phase 17C Trucker Navigation: PASS**

---

## 14. R4 Final Buyer State

Transaction: `MVP-UI17-R4-20260814-R2M5` — **not mutated**.

| Evidence | Expected | Observed |
|----------|----------|----------|
| Shipment exists | yes | PASS — buyer can open R4 shipment |
| Customs status | CLEARED | PASS |
| Inland status | DELIVERED | PASS |
| POD exists | yes | PASS — `PROOF_OF_DELIVERY` in shipment documents |
| True Landed Cost exists | yes | PASS — buyer can open R4 landed cost record |

**R4 Final Buyer State: PASS**

---

## 15. TLC / Unknown ≠ Zero

| Check | Result |
|-------|--------|
| `/buyer/landed-cost/{R4-lc}` loads | PASS |
| Navigation friction (not in buyer sidebar) | ACCEPTED PILOT FRICTION — Ops may direct buyer to TLC page |
| `insuranceCost` | `null` (not zero) |
| `dutyTaxCost` | `null` (not zero) |
| `inlandCost` | `null` (not zero) |

Unknown financial components remain unknown/not provided. No silent zero substitution.

**True Landed Cost: PASS** (with accepted navigation friction)  
**Unknown ≠ Zero: PASS**

---

## 16. POD

R4 POD discoverable via buyer shipment documents API and Trade Documents path.

| Check | Result |
|-------|--------|
| POD document type present | `PROOF_OF_DELIVERY` |
| Buyer-readable | PASS |
| No new upload performed | PASS |

Manifest backup canary confirms R4 POD artifact persistence.

**POD: PASS**

---

## 17. Tenant Isolation Spot Check

Buyer B (`buyer2@beta.test`) vs Buyer A / R4 resources:

| Resource | HTTP | Expected |
|----------|------|----------|
| R4 PO | 403 | denied |
| R4 Shipment | 403 | denied |
| R4 Customs case | 403 | denied |
| R4 Inland delivery | 403 | denied |
| R4 Landed cost | 403 | denied |

No cross-tenant 200 with foreign protected data.

**Tenant Isolation Spot Check: PASS**

---

## 18. Partner Isolation Spot Check

| Check | Result |
|-------|--------|
| Broker foreign UUID case | 404 — denied |
| Trucker foreign UUID delivery | 404 — denied |
| Trucker R4 landed cost | 403 — denied |
| Trucker UI: no Landed Cost / Duty & Tax / buy rate | PASS |

Broker and trucker reach only assigned partner paths validated in 17B/17C.

**Document Isolation Spot Check: PASS** — buyer2 shipment documents → 403  
**Partner Isolation: PASS**

---

## 19. Internal Margin Protection

Spot-check payloads (buyer, broker, trucker on R4 resources):

| Role | buyRate / internalMargin / marginUsd |
|------|--------------------------------------|
| Buyer | not exposed — PASS |
| Broker | not exposed — PASS |
| Trucker | not exposed — PASS |

**Internal Margin Protection: PASS**

---

## 20. UI Hygiene Regression

Phase 16 fix verified on R4 shipment workspace: **no** raw translation key `shipment.booking.pending` visible.

No customer-visible technical errors observed on required paths: no raw UUID prompts, `[object Object]`, stack traces, Prisma errors, or blank pages.

**Phase 16 UI Hygiene Regression: PASS**

---

## 21. Control Tower

Admin/Ops login → Operations / Control Tower surface loads with attention content.

API: `GET /api/control-tower/ops-dashboard` → 200.

**Control Tower: PASS**

---

## 22. Ops Documents / Templates

| Document | Status |
|----------|--------|
| `docs/turkey-paid-pilot-day0-customer1-operations-playbook.md` | EXISTS — canonical ops playbook |
| `docs/pilot-operations/monitoring-runbook.md` | READY |
| `docs/pilot-operations/templates/day0-checklist.md` | READY |
| `docs/pilot-operations/templates/transaction-control-sheet.md` | READY — covers Customer, PO, Shipment, Container, ETA, Customs, Broker, Inland, Trucker, POD, Landed cost, Open issues, Next action, Owner, Last updated |
| `docs/pilot-operations/templates/friction-log.md` | READY — covers transaction, stage, role, problem, workaround, operator minutes, customer impact, severity, repeated?, engineering needed? |
| `docs/turkey-customer1-commercial-brief.md` | EXISTS — Managed Import Pilot, not self-service SaaS |

**Sprint 43 rule confirmed:** Customer friction → log it. Do not open development from isolated requests. Threshold rules in playbook/friction log remain canonical.

**Engineering role confirmed:** INCIDENT ONLY during Customer #1. No hidden Ops (no DB/API/UUID/lifecycle repair as normal operating model).

**Day-0 Checklist: READY**  
**Transaction Control Sheet: READY**  
**Friction Log: READY**  
**Monitoring Runbook: READY**

---

## 23. Customer Support / Partner Readiness

### Customer support path (operating model — no customer PII recorded)

| Item | Status |
|------|--------|
| Support framework defined | YES — Managed Import Pilot with DeMaxtore Ops coordination per playbook |
| Ops owner assignment process | YES — day0-checklist item 31 |
| Customer channel assignment process | YES — day0-checklist item 32 (assigned at onboarding, not pre-customer) |
| Business-hours expectation | YES — business-morning manual monitoring + Ops-mediated pilot support (not 24/7 automatic alerting) |

Customer-specific WhatsApp/email/contact is assigned at Day-0 when a named customer is selected — not required for technical GO before candidate selection.

**Customer Support Path: DEFINED**  
**Engineering Incident Boundary: DEFINED**

### Broker / trucker operating model

| Model | Status |
|-------|--------|
| Broker assignment + Partner Workspace + My Customs Cases + case execution | READY |
| Trucker assignment + Partner Workspace + My Deliveries + delivery execution + POD path | READY |

**Broker Operating Model: READY**  
**Trucker Operating Model: READY**

### Commercial scope

`docs/turkey-customer1-commercial-brief.md` aligns with **Managed Import Pilot**, not self-service SaaS.

**Customer-facing offer** (`docs/turkey-managed-import-pilot-offer.md`): **NOT YET REQUIRED** — prepare when candidate selected; does not block technical GO.

### Workspace Academy

Production Academy remains no-op stub (carry-forward P1). Does not block navigation.

---

## 24. Open Risk Register

### ACCEPTED FOR CONTROLLED PILOT

| # | Risk | Class |
|---|------|-------|
| 1 | Off-host backup not available — total host loss can destroy live data and local backups | P1 — ACCEPTED PILOT RISK |
| 2 | Supplier branding asset IDOR (`GET /api/supplier-organisations/:orgId/logo\|catalog`) | P1 — ACCEPTED (no protected business/financial escalation observed) |
| 3 | No automatic human alerting | P1 — manual runbook compensates |
| 4 | No external uptime probe | P1 — manual runbook compensates |
| 5 | Backup stale exit-code gap (`backup-status.sh` exits 0 on STALE) | P1 — Ops must read FRESH/STALE output |
| 6 | Workspace Academy prod stub | P1 — non-blocking |

### PILOT FRICTION (not stop conditions)

| # | Friction | Class |
|---|----------|-------|
| 7 | True Landed Cost navigation/discoverability — route works; Ops may guide to `/buyer/landed-cost` | PILOT FRICTION |
| 8 | English-default / partial Turkish localization | PILOT FRICTION |
| 9 | Ops handoffs (deposit, freight request, offer publish, broker/trucker assignment) | ACCEPTED PILOT MODEL |

Known risks remain **compatible with Customer #1 controlled pilot**. They are **not resolved** — explicitly **ACCEPTED FOR CONTROLLED PILOT**.

---

## 25. Stop-Condition Evaluation

| Stop condition | Triggered? |
|----------------|:----------:|
| P0 security issue open | NO |
| Cross-tenant isolation failure | NO |
| Production not ready | NO |
| Mandatory dependency down | NO |
| Backup stale >26h | NO |
| 2 consecutive unattended backup failures | NO |
| Uploads backup missing | NO |
| Dangerously low disk capacity | NO |
| Golden Path navigation seam broken | NO |
| Broker cannot reach assigned case | NO |
| Trucker cannot reach assigned delivery | NO |
| Buyer cannot access transaction evidence | NO |
| POD persistence/recovery issue | NO |
| Internal margin exposed | NO |
| Unknown cost as false zero | NO |
| Normal operation requires engineering/DB/API/UUID intervention | NO |

**Stop Condition Triggered: NO**

---

## 26. P0 / P1 / P2

| Class | Count | Notes |
|-------|------:|-------|
| New P0 Open | **0** | |
| New P1 Open | **0** | |
| Carry-Forward P1 | **6** | See §24 |
| P2 Open | **0** new | Existing pilot friction documented, not blocking |

---

## 27. Final Customer #1 Decision

All GO gate criteria from launch spec §59 are satisfied.

**CUSTOMER #1 TECHNICAL GO-LIVE:**

# GO — CONTROLLED PAID PILOT MAY START

Development validation cut is complete. Do not start Sprint 43.

**Next mode:** CUSTOMER #1 — COMMERCIAL + OPERATIONAL ONBOARDING

Use:
- `docs/turkey-customer1-commercial-brief.md`
- `docs/turkey-paid-pilot-day0-customer1-operations-playbook.md`
- `docs/pilot-operations/templates/day0-checklist.md`
- `docs/pilot-operations/templates/transaction-control-sheet.md`
- `docs/pilot-operations/templates/friction-log.md`
- `docs/pilot-operations/monitoring-runbook.md`

Measure only:
1. **Transaction completion** — did the real customer import complete through the managed path?
2. **Ops minutes** — DeMaxtore operational effort per stage
3. **Customer support / friction** — where did customer or partners need help?

Those become the evidence base for Sprint 43.

---

## 58. Final Scorecard

```
TURKEY MVP — FINAL PRE-CUSTOMER SMOKE

Production Health:                    PASS
Production Readiness:                 PASS
Backend Service:                      PASS
Mandatory Dependencies:               PASS
Latest Unattended Backup:             PASS
Backup Freshness <26h:                PASS
DB Backup:                            PASS
Uploads Backup:                       PASS
Backup False-Success Regression:      PASS
Disk Capacity:                        PASS
Daily Monitoring Check:               PASS
Buyer Login:                          PASS
Admin/Ops Login:                      PASS
Supplier Login:                       PASS
Broker Login:                         PASS
Trucker Login:                        PASS
Origin Agent Login:                   PASS
Phase 17A Seams:                      PASS
Phase 17B Broker Navigation:          PASS
Phase 17C Trucker Navigation:         PASS
R4 Final Buyer State:                 PASS
POD:                                  PASS
True Landed Cost:                     PASS
Unknown ≠ Zero:                       PASS
Tenant Isolation Spot Check:          PASS
Document Isolation Spot Check:        PASS
Partner Isolation:                    PASS
Internal Margin Protection:           PASS
Phase 16 UI Hygiene Regression:       PASS
Control Tower:                        PASS
Day-0 Checklist:                      READY
Transaction Control Sheet:            READY
Friction Log:                         READY
Monitoring Runbook:                   READY
Customer Support Path:                DEFINED
Broker Operating Model:               READY
Trucker Operating Model:              READY
Engineering Incident Boundary:        DEFINED
Unexpected 5xx:                       0
New P0 Open:                          0
New P1 Open:                          0
Carry-Forward P1:                     6
P2 Open:                              0
Stop Condition Triggered:             NO
5-Customer Controlled Pilot Capacity: YES
10-Customer Capacity:                 NO
Self-Service Ready:                   NO
Sprint 43 Required Before Customer #1: NO

CUSTOMER #1 TECHNICAL GO-LIVE:        GO
```
