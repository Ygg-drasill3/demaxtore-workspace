# DeMaxtore Operations Audit

**Date:** 2026-06-03  
**Method:** Repository and `docs/` review; no live infrastructure inspection.

---

## Summary

| Area | Result |
|------|--------|
| Process management | **WARN** |
| Environment configuration | **WARN** |
| Database operations | **WARN** / **FAIL** |
| Email operations | **WARN** |
| Storage | **WARN** |
| Logging | **PASS** |
| Recovery / backup | **FAIL** |

---

## Supervisor / Process Management

| Item | Result | Evidence |
|------|--------|----------|
| Supervisor referenced | **WARN** | `docs/email-dns-setup.md` — `supervisorctl restart dmx-backend` |
| Config in repo | **FAIL** | No `ops/` or `.conf` files; `docs/README.md` references missing `ops/{nginx,pm2,scripts}` |
| Backend dev entry | **PASS** | `yarn dev:backend` → `tsx watch src/server.ts` |
| Graceful shutdown | **WARN** | `server.ts` closes HTTP + Prisma; Socket.io not explicitly closed |

---

## Restart Recovery

| Scenario | Result | Evidence |
|----------|--------|----------|
| Backend restart | **PASS** | Stateless API; JWT access; refresh in DB |
| Postgres restart | **PASS** | Connection probe on boot (`server.ts`) |
| Scheduler restart | **WARN** | In-process timers re-register on boot; **no distributed lock** — missed ticks possible during downtime; duplicate ticks if multiple instances |
| Seed dependency | **WARN** | `prisma/seed.ts` idempotent; pilot requires seed or manual users — documented in `accepted-operational-debt.md` |

---

## Environment Variables

| Item | Result | Evidence |
|------|--------|----------|
| Validated config | **PASS** | `apps/backend/src/config/env.ts` — Zod fail-fast |
| `.env.example` completeness | **WARN** | Minimal; missing email/SLA/`APP_BASE_URL` |
| Doc drift | **WARN** | `docs/sprint-1-env.example.txt` uses `JWT_ACCESS_SECRET` vs runtime `JWT_SECRET` |
| Required for pilot | **PASS** | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `STORAGE_DIR` |

---

## Database Operations

| Item | Result | Evidence |
|------|--------|----------|
| Migrations | **PASS** | 6 versioned migrations; `prisma migrate deploy` |
| State guard deploy | **FAIL** | `state-guard-trigger.sql` **manual** step documented in Phase B — not in migration chain |
| Rollback safety | **WARN** | No down migrations; standard Prisma forward-only |
| Connection pooling | **WARN** | Default Prisma client; no PgBouncer config in repo |

---

## Backup & Restore

| Item | Result | Evidence |
|------|--------|----------|
| Backup strategy documented | **FAIL** | No runbook under `docs/` |
| Restore procedure | **FAIL** | Not documented |
| Upload file backup | **FAIL** | `STORAGE_DIR` local disk; no replication doc |

---

## Email Provider Setup

| Item | Result | Evidence |
|------|--------|----------|
| Code paths | **PASS** | `mailer.ts`, `provider.ts` — `console` \| `resend` \| `smtp` |
| DNS checklist | **PASS** | `docs/email-dns-setup.md` — SPF, DKIM, DMARC guidance |
| Production activation | **WARN** | Default `EMAIL_PROVIDER=console`; `accepted-operational-debt.md` |
| SPF/DKIM/DMARC live | **UNKNOWN** | Not verifiable from code |

---

## Log Retention

| Item | Result | Evidence |
|------|--------|----------|
| Structured logs | **PASS** | Pino `config/logger.ts` |
| HTTP access logs | **PASS** | Morgan → pino in `app.ts` |
| Retention policy | **FAIL** | No rotation/retention config in repo |
| Supervisor log path | **WARN** | Referenced in `sprint-2.9-messaging-delivery-report.md` only |

---

## Disk Growth Risk

| Item | Result | Evidence |
|------|--------|----------|
| Upload storage | **WARN** | `STORAGE_DIR` grows per attachment; no cleanup job |
| Audit/timeline | **WARN** | Append-only by design; no archival |
| Notifications | **WARN** | Rows accumulate; indexed but unbounded |
| Telemetry | **WARN** | `telemetry_events` insert-only |

---

## Infrastructure in Repository

| Item | Result | Evidence |
|------|--------|----------|
| Docker / Compose | **FAIL** | Not present |
| Nginx config | **FAIL** | Not in repo |
| CI pipeline for deploy | **UNKNOWN** | Not audited in this pass |

---

## Operations Audit Verdict

**FAIL** for unattended production operations.  
**WARN** for a **single-server pilot** with an operator who runs `prisma migrate deploy`, manually applies `state-guard-trigger.sql`, configures email env, and maintains Postgres/filesystem backups outside the repo.
