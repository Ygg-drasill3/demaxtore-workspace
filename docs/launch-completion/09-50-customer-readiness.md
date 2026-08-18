# 50 Customer Readiness Report

**Date:** 2026-06-17  
**Method:** Code hotspot analysis + staging DB scale (126 orders, not yet at 50-customer load)  
**Simulated load:** 50 buyers, 200 suppliers, 1000 RFQ, 300 active orders, 150 shipments, 5000 docs, 10000 timeline events

---

## Verdict: **FEASIBLE at P0 pilot scale with known bottlenecks**

---

## Bottleneck ranking (at target load)

| Rank | Module | Pattern | ~50 customers | Risk |
|------|--------|---------|---------------|------|
| 1 | Document Center | `collectAccessible()` full workspace + doc scan, memory filter | 2–5s admin pages | **High** — human triage for heavy doc review |
| 2 | Exception Hub | `syncAlertsForActor` on list open (skipped when v2 on) | 1–3s per hub open | **Medium** |
| 3 | Control Tower | 15m full scan, 100 orders/scan | Alert accumulation | **Low** — ops review |
| 4 | RFQ list | Per-row `repairRfqStateIfOrderClosed` | Extra query/page | **Low** |
| 5 | Scale portfolio | Per-org 7-query loop | Admin-only | **Low** at 50 |
| 6 | Socket.io | Memory adapter | OK single instance | **N/A** at 50 |
| 7 | PostgreSQL | Default pool (25/process) | OK single VPS | **Low** |

---

## Resource risks (single VPS, 2 PM2 instances)

| Resource | Risk at 50 | Mitigation (ops, not new product) |
|----------|------------|-----------------------------------|
| CPU | Control Tower + schedulers | Single region OK |
| RAM | Document Center in-memory filter | Limit concurrent admin doc sessions |
| DB connections | PM2 × 2 × pool 25 | Monitor; PgBouncer at 200+ orders |
| Storage | Local `.data/uploads` | `STORAGE_PROVIDER=s3` for multi-instance |
| WebSocket | Memory adapter | OK at 50 single-node |

---

## Human intervention required

- Exception resolution / triage
- Document approval workflows
- Desync remediation (1 documented pair today)
- RFQ deadline edge cases
- Payment dispute handling

---

## Query / index notes

- `timeline_events(workspace_id, created_at)` indexed — OK
- Participant composite index gap noted in audit — tolerable at 50

---

## Decision

**50-customer P0 pilot:** **READY WITH MINOR RISKS** — core RFQ→order→shipment path scales; Document Center and Exception Hub need ops awareness, not blocking for controlled pilot.
