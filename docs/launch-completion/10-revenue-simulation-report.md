# Revenue Simulation Report

**Date:** 2026-06-17  
**Method:** Scenario walkthrough against existing E2E flows, runbooks, and staging architecture  
**Scenario:** 10 active customers → 20 RFQ → 50 quotes → 10 orders → 5 shipments → 2 payment disputes → 3 doc exceptions → 1 carrier delay

---

## Verdict: **FEASIBLE — layers interact correctly at P0 (flags OFF)**

---

## Flow validation

| Step | Layer | Expected behavior | Staging evidence |
|------|-------|-------------------|------------------|
| RFQ submit | RFQ FSM + notifications | Quotes collected, deadlines enforced | E2E `02-rfq-flow`, `05-order-flow` |
| Quote → order | Order spawn + participants | Supplier selected, order created | E2E `05-order-flow` |
| Order logistics | Order FSM (manual at P0) | Production, freight, book shipment | E2E `05-order-flow` |
| Shipment | Shipment FSM | Milestones through IN_TRANSIT | E2E `06-shipment-flow` |
| Payment intent | Payment service + **ACL** | Participant-only access | `payment.policy.test.ts` |
| Payment dispute | Milestone `PAYMENT_DISPUTED` | Hold on order actions when P4 on | Unit tests; P4 blocked until seed |
| Doc exception | Trade docs + CT alerts | `TRADE_DOC_*` alerts → Exception Hub | E2E `28-document-center` |
| Carrier delay | Tracking + CT | `TRACKING_DELAY`, `SHIPMENT_ETA_EXCEEDED` | Alert engine + CT scan |
| Orchestrator | Shadow (when enabled) | Recommendations only, no state change | Integration tests pass |

---

## Cross-cutting systems

| System | 10-customer revenue scenario |
|--------|------------------------------|
| Exception engine | 175 exceptions in 7d on staging — hub handles triage; v1 sync skipped when v2 on |
| Control Tower | 15m scan produces stall/desync/doc alerts |
| Notifications | Email provider `up` on `/api/ready` |
| Socket | Realtime invalidation — OK single instance |
| Payment layer | IDOR fixed; webhook secrets missing (config gap) |
| Orchestrator | OFF at P0 — manual order/shipment path; desync risk documented |

---

## Failure modes (ops playbook)

| Event | Handling |
|-------|----------|
| Payment dispute | Exception Hub + manual milestone satisfy / hold |
| Doc rejection | Exception Hub `Document Rejected` type |
| Carrier delay | CT alert + manual shipment update |
| Desync | `fsm-migration-audit.mjs` daily |

---

## Decision

**First revenue (10 customers, flags OFF):** **READY** — core path proven by E2E; ops handles exceptions manually. Payment webhook secrets must be set before real payment webhooks.
