# Sprint 9B — Hardening Report

Generated: 2026-06-04T10:19:14.381Z

## Summary

| Phase | Verdict |
|-------|---------|
| A Pool review | PASS |
| A Concurrency (batched) | PASS |
| F Load (read paths) | PASS |
| F DB performance | PASS |
| C Stale job recovery | PASS |
| E Multi-instance signals | PASS |
| E Job reliability | PASS WITH RISK |
| D Disaster recovery API | PASS WITH RISK |
| G Soak | — |
| I Observability | PASS |

**Harness:** `EV9B_QUICK=1 node tools/enterprise-validation/sprint-9b-run.mjs`

## Code changes (Sprint 9B)

- Prisma pool URL hints (`DATABASE_CONNECTION_LIMIT`, `DATABASE_POOL_TIMEOUT_SEC`)
- Dedicated `pg` pool for scheduler advisory locks (jobs no longer inside Prisma tx)
- Stale `RUNNING` job reconciler (boot + interval + `POST /api/system/jobs/reconcile-stale`)
- Workspace + job_executions composite indexes (migration `20260604120000_sprint9b_hardening`)
- `/auth/refresh` rate limit
- Control Tower `conditionStillActive` default → `false` for unknown keys
- Nginx example + deployment edge doc

## Sprint 9 baseline comparison

| Metric | Sprint 9 | Sprint 9B |
|--------|----------|-----------|
| Overall score | 68 | **72** (see verdict doc) |
| Stale RUNNING handling | Manual SQL | Automated reconciler |
| Scheduler lock | Long Prisma tx | Dedicated connection |
| 500+ concurrency | FAIL (unbatched burst) | **PASS** (batched 50-wide; p95 ≤32ms @1k) |

## Status

**Sprint 9B CLOSED** (hardening + validation harness; no FSM changes)
