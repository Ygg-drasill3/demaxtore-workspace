# Import OS — Commercial Claim Matrix

**Date:** 2026-08-17  
**Mode:** Read-only forensic audit — evidence-based sales wording only  
**Production checked:** `https://workspace.demaxtore.com` (`TRACKING_PROVIDER=manual`, `EXCEPTION_ENGINE_V2_ENABLED=true`)

| Claim | Safe to say? | Qualifier required? | Evidence | Recommended sales wording |
|-------|--------------|---------------------|----------|---------------------------|
| Real-time shipment visibility | **Partial** | **Yes** | Import Control Tower polls every 60s; sockets for alert create/resolve and tracking delay; not GPS streaming | "Operational shipment visibility with periodic refresh and attention signals — not a continuous GPS feed in default deployment." |
| Live shipment tracking | **Partial** | **Yes** | `GET /api/shipments/tracking/config` returns `provider: manual`, `liveApi: false`; `ShipmentTrackingPanel` shows explicit simulated disclaimer when MANUAL | "Maritime tracking module with ETA/status monitoring. Default workspace uses simulated carrier updates; live carrier API requires production configuration." |
| Control Tower | **Yes** | **Light** | Buyer `/buyer/control-tower`, Admin `/operations`, API `/api/control-tower/dashboard` + `/ops-dashboard`; E2E tests pass | "Import Control Tower — a trade-level operations view with KPIs, pipeline, attention queue, risks, and activity feed." |
| Exception management | **Yes** | **Light** | `/exceptions` hub with assign/resolve/close; 130+ alert keys; TradeException lifecycle; production ABC buyer has open exceptions | "Structured exception hub with severity, ownership, and resolution workflow tied to trade context." |
| Proactive exception management | **Partial** | **Yes** | In-app toasts via sockets (`GlobalAlertBridge`) + 30s poll; **no exception email/webhook** found | "In-workspace proactive alerts and exception toasts. Email/push escalation is not part of today's exception engine." |
| Shipment timeline | **Yes** | **Light** | Trade timeline API returns 17 events (ABC) / 39 events (R4); cross-workspace `timeline_events` ledger | "Cross-workspace trade timeline from RFQ/PO through freight and shipment milestones." |
| End-to-end import visibility | **Partial** | **Yes** | R4 golden path connects product→PO→freight→shipment→customs→inland→POD→landed cost; customs/inland not fully unified in timeline | "End-to-end import visibility for managed Turkey import transactions, with ops-assisted steps where automation ends." |
| Document Hub | **Yes** | **No** | `/documents` aggregates TRADE/ORDER/SHIPMENT/RFQ sources; versioning, approve/reject, tenant isolation (Phase 12 IDOR 69/69) | "Document Hub — a unified document center across trade workspaces with compliance status." |
| Trade document management | **Yes** | **Light** | Trade Documents compliance engine: CI/PL/BOL requirements, approve/reject, revision request | "Trade document checklist with requirement rules, review workflow, and compliance readiness." |
| Customs document readiness | **Yes** | **Light** | `customs.service.evaluateReadiness()` checks CI/PL/BOL; drives Exception Intelligence issues | "Customs readiness evaluates required trade documents and surfaces blockers before broker execution." |
| Single source of truth for your import | **Partial** | **Yes** | Same R4 transaction visible across order/shipment/customs/inland/docs; three parallel exception stores; timeline gaps for customs/inland | "One workspace lineage for a managed import transaction — not yet a fully unified event ledger across every execution domain." |
| Track your import from PO to delivery | **Partial** | **Yes** | R4 evidence PASS through POD; ABC demo stops at in-transit shipment without full doc/customs chain | "Track managed imports from PO through shipment, customs, delivery, and POD on Turkey import operating paths." |
| See which shipments need attention | **Yes** | **No** | Import Control Tower `attentionRequired` (ABC: 6 items; R4 buyer: 18); admin alert table | "See which trades and shipments need attention in Import Control Tower and the admin operations center." |
| Manage freight, customs and delivery in one workspace | **Yes** | **Light** | Turkey buyer nav + R4 golden path; shared engine, segmented presentation (Sprint 43R) | "Manage freight, customs, and delivery from one import workspace — designed for Turkey importers, with shared engine underneath." |

## Claims to avoid (D0 — sales claim risk)

1. **"Live GPS vessel tracking"** — map UI uses port interpolation / preview markers; backend snapshots have no lat/lng in default mode.
2. **"Real-time carrier feed out of the box"** — production `TRACKING_PROVIDER=manual`.
3. **"Automated email escalation for exceptions"** — not implemented for exception/alert engine.
4. **"Fully automated end-to-end import with no ops touch"** — R4 golden path explicitly ops-assisted (freight offer, deposit, broker, trucker).
5. **"AI/predictive ETA"** — delay detection is rule-based threshold comparison, not prediction.
