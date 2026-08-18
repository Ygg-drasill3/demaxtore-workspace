# RBAC Rollout Report

**Date:** 2026-06-17  
**Verdict:** **READY (P0 flag OFF)** | **BLOCKED (P7 enablement)**

---

## Migration

| Check | Status |
|-------|--------|
| `20260617180000_rbac_expanded_roles` | **APPLIED** — schema up to date |
| Prisma `Role` enum includes expanded roles | **PASS** |

---

## User role distribution (staging DB)

| Role | Count |
|------|------:|
| SUPPLIER | 9 |
| BUYER | 4 |
| ADMIN | 2 |

**Expanded-role users:** **0** — no `FORWARDER`, `OPS_MANAGER`, `FINANCE_OPERATOR`, etc.

---

## Unit tests

| Suite | Result |
|-------|--------|
| `require-permission.test.ts` | **PASS** (4 tests) |

---

## Route wiring gap (documented)

Only **5 routes** use `requirePermissionOrLegacyAdmin`. Most admin routes still use legacy `requireRole("ADMIN")`. This is acceptable at P0 with `RBAC_EXPANDED_ROLES_ENABLED=false`.

---

## P7 enablement blockers

| Blocker | Status |
|---------|--------|
| Forwarder user accounts seeded | **FAIL** — 0 FORWARDER users |
| Role migration for ops/finance users | **FAIL** |
| E2E regression with flag on | Not run |

---

## Decision

| Scenario | Verdict |
|----------|---------|
| P0 pilot (RBAC flag OFF) | **READY** |
| P7 `RBAC_EXPANDED_ROLES_ENABLED=true` | **BLOCKED** — user migration required |

See [`rbac-expanded-rollout-runbook.md`](../rbac-expanded-rollout-runbook.md).
