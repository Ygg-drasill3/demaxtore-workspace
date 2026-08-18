# Sprint 3.9 — Performance Review Report

**Date:** 2026-06-03  
**Method:** Static review only (no blind optimization per sprint scope)

---

## Verdict: **WARN** (unchanged; pilot-scale acceptable)

---

## Proven risks (documented)

| Risk | Location | Severity |
|------|----------|----------|
| SLA worker N+1 user lookup | `messaging/sla-worker.ts` | WARN |
| CB scheduler per-workspace count | `commoditybid.scheduler.ts` | WARN |
| CB `loadFull` all submissions | `commoditybid.service.ts` | WARN |
| Sequential notification inserts | RFQ/Order/Shipment services | WARN |
| RFQ timeline cap 200 | `rfq.service.read.ts` | WARN |
| Missing `(type, state, deadline_at)` index | `schema.prisma` | WARN |
| Local disk uploads | `STORAGE_DIR` | WARN |

---

## Not changed in 3.9

No query refactors or new indexes (audit scope: document only).

---

## Scheduler locking note

Advisory locks add negligible overhead (~1ms) per tick; prevent duplicate work under multi-instance — **net positive** for performance consistency.

---

## Rate limiting note

In-memory limiter: O(1) per request; not suitable for multi-node shared counters without Redis (documented in middleware).

---

## Recommendation

Address indexes and CB `loadFull` in a future performance sprint if workspace count exceeds pilot volume.
