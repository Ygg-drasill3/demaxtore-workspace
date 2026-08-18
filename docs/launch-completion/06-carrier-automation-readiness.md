# Carrier Automation Readiness Report

**Date:** 2026-06-17  
**Verdict:** **READY (code)** | **BLOCKED (P6 production enablement)**

---

## Unit tests

| Suite | Result |
|-------|--------|
| `carrier-event.service.test.ts` | **PASS** (9 tests) |
| Missing `eventId` returns null | **PASS** |
| Confidence matrix low/medium/high | **PASS** |

---

## Database audit (staging)

| Table | Result |
|-------|--------|
| `carrier_event_records` | **0 rows** — no production carrier traffic yet |
| `processed_events` (carrier webhooks) | **0 rows** |

---

## Security controls (verified in code)

| Control | Status |
|---------|--------|
| `eventId` required at webhook route | **PASS** — no `Date.now()` fallback |
| HMAC (`CARRIER_WEBHOOK_SECRET`) | **MISSING in .env** — required for production |
| Replay dedup (`claimProcessedEvent`) | **PASS** |
| Low confidence → timeline only | **PASS** |
| Medium → review queue | **PASS** |
| High + auto off → logged only | **PASS** (current default) |
| Manual shipment override | **PASS** — FSM actions independent of carrier flag |

---

## Rollout dependency

Per [`carrier-automation-rollout-runbook.md`](../carrier-automation-rollout-runbook.md):

**P6 requires P2** (`FSM_ORCHESTRATOR_AUTO_APPLY=true`) — carrier high-confidence events route through orchestrator for order mirror.

| Phase | Status |
|-------|--------|
| P6 code readiness | **READY** |
| P6 staging enablement | **BLOCKED** — P2 not ready + webhook secret missing |
| P6 production enablement | **BLOCKED** |

---

## Decision

- **Code:** READY for pilot webhook ingestion with HMAC + eventId  
- **Flag `CARRIER_AUTO_TRANSITION_ENABLED`:** BLOCKED until P2 shadow soak + auto-apply gates pass
