# Production Launch Checklist (P0 Pilot)

**Audience:** Ops / release engineer  
**Scope:** Flags OFF, &lt;50 active trades, single-region VPS pilot  
**Run validation:** `./scripts/production-p0-validate.sh`

---

## Infrastructure

| Item | Done | Notes |
|------|------|-------|
| VPS provisioned | ☐ | Single region OK for pilot |
| PM2 cluster (`ecosystem.config.cjs`) | ☐ | Default 2 instances |
| Nginx reverse proxy + TLS | ☐ | `deploy/nginx/demaxtore.conf.example` |
| DNS A/AAAA | ☐ | |
| PostgreSQL 15+ | ☐ | `npx prisma migrate deploy` |
| Automated `pg_dump` | ☐ | `scripts/backup-cron.example.sh` |
| Redis (if 2+ PM2 instances) | ☐ | `SOCKET_ADAPTER=redis` |

## Application secrets

| Item | Done |
|------|------|
| `JWT_SECRET` / `JWT_REFRESH_SECRET` (high entropy) | ☐ |
| `DATABASE_URL` + pool limits | ☐ |
| `PAYMENT_WEBHOOK_SECRET` + HMAC enforce | ☐ |
| `CARRIER_WEBHOOK_SECRET` + HMAC enforce | ☐ |
| `WORKSPACE_BRIDGE_SECRET` | ☐ |
| Email (`RESEND` or SMTP) | ☐ |
| `CORS_ORIGIN`, `APP_BASE_URL` | ☐ |
| All Faz 2–6 flags **OFF** | ☐ |

## Pre-launch validation

```bash
./scripts/production-p0-validate.sh
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
yarn workspace @dmx/e2e test tests/05-order-flow.spec.ts
yarn workspace @dmx/e2e test tests/06-shipment-flow.spec.ts
yarn workspace @dmx/e2e test tests/39-production-hardening.spec.ts
```

**Desync gate:** `undocumentedDesyncCount` must be `0`. Documented pairs live in `docs/desync-documented-exceptions.json`.

## Monitoring minimum

See `docs/ops-monitoring-minimum.md`.

## P1 shadow soak (before AUTO_APPLY)

7 consecutive days:

```bash
./scripts/p1-shadow-soak-daily.sh
```

Sign-off when `docs/shadow-parity-report-latest.md` shows stable recommendation quality and zero new undocumented desync.
