# Sprint 3.9 — State Guard Hardening Report

**Date:** 2026-06-03  
**P0:** State guard outside Prisma migrate chain

---

## Change

| Item | Detail |
|------|--------|
| Migration | `apps/backend/prisma/migrations/20260606120000_sprint39_state_guard/migration.sql` |
| Deprecated manual file | `state-guard-trigger.sql` (pointer only) |
| Deploy | `npx prisma migrate deploy` applies triggers automatically |

Contents: partial unique index, `workspaces_state_guard`, currency guard, audit/timeline REVOKE (role `dmx` if exists), deadline CHECK constraints.

---

## Validation

| Test | Result |
|------|--------|
| Direct `UPDATE workspaces SET state=…` without `app.fsm_authorised` | **FAIL** (raises check_violation) |
| `UPDATE` with `SET LOCAL app.fsm_authorised = 'true'` in transaction | **PASS** |
| Vitest | `apps/backend/src/hardening/state-guard.test.ts` — **2/2 PASS** |

```bash
cd apps/backend && npx prisma migrate deploy && yarn test src/hardening/state-guard.test.ts
```

---

## Fresh database proof

1. Create empty DB  
2. `prisma migrate deploy` (7 migrations)  
3. State guard active without manual `psql -f`

---

## P0 status

**CLOSED** — State guard is in the Prisma migration chain.
