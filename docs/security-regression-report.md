# Sprint 3.9 — Security Regression Report

**Date:** 2026-06-03  
**Scope:** Post-hardening verification (no FSM/workflow changes)

---

## Results

| Control | Result | Notes |
|---------|--------|-------|
| JWT validation | **PASS** | Unchanged; handshake + `requireAuth` |
| Refresh token rotation | **PASS** | Unchanged |
| RBAC | **PASS** | FSM + policies; workspace router for sockets |
| RLS (CommodityBid submissions) | **PASS** | Migration unchanged |
| Attachment permissions | **PASS** | `canAccess*` on document routes |
| Socket auth | **PASS** | JWT handshake + type-aware subscribe |
| Cross-tenant isolation | **PASS** | E2E buyer2 RFQ deny; participant gates |
| Admin routes | **PASS** | `requireRole("ADMIN")` on admin routers |
| Rate limiting | **PASS** | Login/forgot/reset/telemetry/socket; E2E 429 on forgot |
| CSRF | **PASS** (accepted) | Documented not required — `csrf-assessment.md` |
| State guard (DB) | **PASS** | Migration + vitest |
| Audit tamper (DB) | **WARN** | REVOKE in migration; superuser bypass possible |
| Global API rate limit | **WARN** | Auth/telemetry/socket only; not all routes |
| Org-level tenant | **WARN** | Unchanged; workspace-scoped model |

---

## New hardening artifacts

| Artifact | Path |
|----------|------|
| State guard migration | `20260606120000_sprint39_state_guard` |
| Workspace ACL | `workspace.policy.ts` |
| Rate limit | `middleware/rate-limit.ts` |
| Scheduler lock | `db/scheduler-lock.ts` |

---

## Overall

**PASS** for pilot security bar with documented WARN items unchanged from audit v2 except **P0 items closed**.
