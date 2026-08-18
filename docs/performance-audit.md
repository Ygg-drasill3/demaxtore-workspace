# DeMaxtore Performance Audit

**Date:** 2026-06-03  
**Method:** Static code review (no load testing).

---

## Summary

| Area | Result |
|------|--------|
| Query patterns (workspaces) | **WARN** |
| Schedulers | **WARN** |
| Notifications fan-out | **WARN** |
| Socket fan-out | **PASS** at pilot scale |
| Attachments | **WARN** |
| Indexes | **WARN** |
| Transactions | **PASS** |

**Verdict: WARN** — Adequate for single-tenant pilot with tens of workspaces; hotspots appear before hundreds of concurrent workspaces without changes.

---

## N+1 and Batch Queries

| Location | Risk | Evidence |
|----------|------|----------|
| SLA worker | **WARN** | Per-workspace `user.findUnique` in loop — `messaging/sla-worker.ts` |
| CB scheduler | **WARN** | Per-workspace `commodityBidSubmission.count` — `commoditybid.scheduler.ts` |
| CB `loadFull` | **WARN** | Loads all `commodityBidSubmissions` on transitions — `commoditybid.service.ts` |
| CB `issue_contracts` | **WARN** | `findFirst` per supplier in loop |
| RFQ quotations list | **PASS** | Batched supplier lookup in controller |
| Notification inserts | **WARN** | Sequential `create` per recipient in RFQ/Order/Shipment services |

---

## Large Result Sets

| Endpoint / read | Risk | Evidence |
|-----------------|------|----------|
| RFQ timeline | **WARN** | Hard cap 200 events — `rfq.service.read.ts` |
| Order/Shipment timeline | **WARN** | No cap observed — unbounded `findMany` |
| Notifications list | **WARN** | Paginated in controller; high-volume users unbounded over time |
| CB list | **WARN** | Heavy includes (lots, invitations, participants); `total` = page length not DB count |

---

## Indexes

| Index | Status | Evidence |
|-------|--------|----------|
| `workspaces(type, state)` | **PASS** | `schema.prisma` |
| Scheduler deadline queries | **WARN** | No `(type, state, deadline_at)` composite |
| Notifications `[userId, isRead, createdAt]` | **PASS** | Schema |
| Timeline `[workspaceId, createdAt]` | **PASS** | Schema |
| Partial unique active supplier assignment | **WARN** | Only in `state-guard-trigger.sql`, not migrate chain |

---

## Prisma Transactions

| Pattern | Result | Evidence |
|---------|--------|----------|
| FSM transitions | **PASS** | `$transaction` + `FOR UPDATE` on workspace |
| Spawn (order/shipment) | **PASS** | Within parent transition transaction |
| Idempotency | **PASS** | Placeholder row + replay |

---

## Socket Fanout Scaling

| Pattern | Result | Notes |
|---------|--------|-------|
| `emitToWorkspace` | **PASS** | O(room members) per event |
| `emitToUser` / `emitToRole` | **PASS** | Targeted |
| Post-commit emit | **PASS** | Avoids ghost events on rollback |

At pilot scale (single digit concurrent sockets), **PASS**.

---

## Attachment Scaling

| Item | Result | Notes |
|------|--------|-------|
| Local disk storage | **WARN** | No S3/object store abstraction in code |
| 25MB limit | **PASS** | Multer limit |
| Streaming download | **PASS** | `createReadStream` |

---

## Scheduler Scaling

| Item | Result | Notes |
|------|--------|-------|
| Multi-instance | **FAIL** | Duplicate deadline processing possible |
| Batch size | **PASS** | `take: 20` / `50` limits per tick |

---

## Table Hotspots (predicted)

| Table | Risk |
|-------|------|
| `timeline_events` | High write rate per transition |
| `audit_logs` | Same |
| `notifications` | Fan-out per transition |
| `workspaces` | Row lock contention on hot workspace |

---

## Performance Audit Verdict

**WARN** — No evidence of load-test failure; code patterns are acceptable for **controlled pilot**. Address scheduler indexes, CB `loadFull`, and timeline pagination before scaling tenant count or workspace volume.
