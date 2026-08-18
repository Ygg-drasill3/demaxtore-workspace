# Technical Debt Register — DeMaxtore

**Last updated:** 2026-06-18  
**Scope:** Accepted risks only — no new development items  
**Production impact:** None are launch blockers (verified E2E + unit coverage)

---

## Summary

| Priority | Count | Launch blocker? |
|----------|-------|-----------------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 3 | No |
| Low | 5 | No |

---

## Medium priority

### TD-M1 — PO / CommodityBid concurrent race

| Field | Detail |
|-------|--------|
| **Risk** | Two concurrent requests may race on PO issue or CommodityBid winner selection without row-level lock |
| **Impact** | Theoretical double-winner or duplicate PO under extreme concurrency; DB unique constraints may partially guard |
| **Evidence** | Accepted risk documented in red-team audit; no production incident |
| **Mitigation (current)** | Single PM2 instance; low traffic at launch; idempotency keys on key actions |
| **Solution** | Atomic `updateMany` with state guard OR `$transaction` + `SELECT FOR UPDATE` on workspace row |
| **Priority** | Medium — address before high-volume auction or automated PO batch |
| **Effort** | Small (1–2 days) |

---

### TD-M2 — Payment milestone non-transactional writes

| Field | Detail |
|-------|--------|
| **Risk** | Some payment-milestone side effects may not be fully wrapped in a single DB transaction |
| **Impact** | Partial write on crash mid-handler; retry may leave inconsistent milestone vs timeline |
| **Evidence** | Code review finding; webhook idempotency via `processedEventId` reduces replay risk |
| **Mitigation (current)** | Idempotent webhook processing; duplicate returns `duplicate:true` |
| **Solution** | Wrap milestone + timeline + order hold in `prisma.$transaction` |
| **Priority** | Medium — before payment volume scales |
| **Effort** | Small (1 day) |

---

### TD-M3 — FreightRevenueLedger missing composite index

| Field | Detail |
|-------|--------|
| **Risk** | Queries by `orderId` + `shipmentId` may full-scan as ledger grows |
| **Impact** | Slow admin/report queries at scale; no user-facing blocker at launch volume |
| **Evidence** | Schema review |
| **Mitigation (current)** | Table small at pilot |
| **Solution** | Add `@@index([orderId, shipmentId])` migration |
| **Priority** | Medium — first post-launch migration window |
| **Effort** | Trivial (migration + deploy) |

---

## Low priority

### TD-L1 — Backend not on PM2 (runtime)

| Field | Detail |
|-------|--------|
| **Risk** | Standalone `tsx` / nohup process — no auto-restart on reboot |
| **Impact** | Manual recovery after host restart |
| **Solution** | Follow `docs/operations/pm2-production-runbook.md` |
| **Priority** | Low (ops task, config ready in `ecosystem.config.cjs`) |

---

### TD-L2 — In-memory rate limiter

| Field | Detail |
|-------|--------|
| **Risk** | Auth refresh/login limits stored in process memory |
| **Impact** | Limits reset on restart; not shared across instances |
| **Solution** | Redis-backed rate limit when `PM2_INSTANCES > 1` |
| **Priority** | Low at single-instance launch |

---

### TD-L3 — RFQ clarification attachments TODO

| Field | Detail |
|-------|--------|
| **Risk** | `RfqClarificationPanel.tsx` comment: attachment backend wiring incomplete |
| **Impact** | Clarification thread may not attach files in UI |
| **Solution** | Wire to existing attachment upload API |
| **Priority** | Low — workaround via RFQ attachments elsewhere |

---

### TD-L4 — Frontend served via Vite dev (non-prod host)

| Field | Detail |
|-------|--------|
| **Risk** | Port 3010 Vite dev server used for E2E/staging |
| **Impact** | Not suitable for production traffic |
| **Solution** | Nginx + `yarn workspace @dmx/frontend build` static serve |
| **Priority** | Low (ops deploy step) |

---

### TD-L5 — External log aggregation not deployed

| Field | Detail |
|-------|--------|
| **Risk** | Logs local to host only |
| **Impact** | Harder incident forensics across restarts |
| **Solution** | PM2 logrotate + ship to Loki/CloudWatch (see monitoring plan) |
| **Priority** | Low week 1; recommended week 2 |

---

## Explicitly closed (not debt)

| Item | Status |
|------|--------|
| Payment webhook HMAC | ✅ Verified |
| Carrier webhook HMAC | ✅ Verified |
| Tenant isolation (order, documents) | ✅ 403 verified |
| Document Center requestRevision IDOR | ✅ Unit test |
| Control Tower trade_doc_rejected auto-resolve | ✅ Fixed |
| Trade flow E2E | ✅ 62/62 |

---

## Review schedule

| When | Action |
|------|--------|
| Day 30 | Re-score medium items by actual traffic |
| Before PM2 scale-out | Close TD-M1, TD-L2 |
| Before payment go-live volume | Close TD-M2 |
