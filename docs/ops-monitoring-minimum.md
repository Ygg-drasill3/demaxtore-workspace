# Operations Monitoring Minimum (Days 0–30)

Minimum observability for P0 pilot without full APM stack.

---

## Health endpoints

| Endpoint | Use |
|----------|-----|
| `GET /api/healthz` | Liveness — process up |
| `GET /api/ready` | Readiness — DB reachable |

Configure load balancer / uptime monitor to poll both every 60s.

## Logging

- Backend uses **Pino** (`LOG_LEVEL=info` in production).
- **Minimum:** ship stdout/stderr to a centralized store (e.g. journald → Loki, CloudWatch, or hosted log drain).
- Alert on sustained `level>=50` (error) spike or `5xx` rate from Nginx access log.

## In-app operations

- **Control Tower** — desync and stall alerts (15m scan).
- **System Operations** dashboard — backup overdue via `system-alerts.ts`.
- **Backup verification API** — record manual `pg_dump` runs.

## Backups

1. Schedule: `scripts/backup-cron.example.sh` (daily 02:00 recommended).
2. Quarterly: `RUN_RESTORE_DRILL=1` against isolated DB — see `tools/hardening/backup-restore-drill.sh` and `docs/backup-runbook.md`.
3. Verify `GET /api/system/backup-status` (admin) shows recent backup record.

## Daily ops (launch week)

| Task | Command |
|------|---------|
| Desync audit | `npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose` |
| Error log review | grep `level\":50` in centralized logs |
| Backup check | admin System Operations or backup API |

## P1 shadow soak

While `FSM_ORCHESTRATOR_ENABLED=true` + `SHADOW_MODE=true`:

```bash
./scripts/p1-shadow-soak-daily.sh
```

Retain 7 daily reports under `.data/shadow-soak/` before enabling P2 auto-apply.

## Not in scope (post-pilot)

- Prometheus/Grafana dashboards
- Sentry APM
- On-call paging integration

Document incident contacts in your team runbook; platform has no built-in on-call router.
