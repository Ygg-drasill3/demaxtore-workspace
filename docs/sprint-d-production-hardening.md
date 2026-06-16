# Sprint D — Production Hardening Runbook

Zero-downtime deployment checklist for DeMaxtore backend (Faz 4).

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/healthz` | **Liveness** — process up, no dependency checks |
| `GET /api/ready` | **Readiness** — DB, storage, email, Redis (if configured), socket adapter |

Load balancers should use `/api/healthz` for liveness and `/api/ready` for traffic routing.

## Pre-deploy checklist

1. Run `yarn workspace @dmx/backend prisma migrate status` — no pending migrations.
2. Run `yarn workspace @dmx/backend tsc --noEmit` and unit tests.
3. Run E2E subset: `39-production-hardening.spec.ts`, `10-freightiq-foundation.spec.ts`, `29-exception-hub.spec.ts`.
4. Backup database (`docs/backup-runbook.md`).
5. Set production env (see below).

## Deploy (PM2 cluster)

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main
yarn install --frozen-lockfile
yarn workspace @dmx/backend prisma migrate deploy
yarn workspace @dmx/backend prisma generate
pm2 reload ecosystem.config.cjs --update-env
```

`ecosystem.config.cjs` uses `exec_mode: cluster` with `PM2_INSTANCES` (default 2).

## Migration safety

- Migrations are **forward-only**; always run `prisma migrate deploy` before reloading app instances.
- New indexes (Sprint D) use `CREATE INDEX IF NOT EXISTS` — safe on large tables.
- Never run `prisma migrate reset` in production.

## Rollback checklist

1. `pm2 reload` previous release artifact (git tag / deployment snapshot).
2. If migration was applied and is incompatible, restore DB from backup — **do not** force-downgrade schema without DBA review.
3. Verify `/api/ready` returns `ready: true`.
4. Smoke: login, RFQ list, order workspace, exception hub.

## Multi-instance (Socket.io)

| `SOCKET_ADAPTER` | Behaviour |
|------------------|-----------|
| `memory` (default) | Single-instance or sticky sessions required |
| `redis` | Cross-instance room broadcast via `REDIS_URL` |

When using Redis adapter:

```env
SOCKET_ADAPTER=redis
REDIS_URL=redis://user:pass@redis-host:6379/0
```

Nginx: keep sticky sessions for `/socket.io/` as belt-and-suspenders, or rely on Redis adapter alone.

## Required production env

```env
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=https://app.example.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=...
STORAGE_PROVIDER=s3
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
TRACKING_PROVIDER=mock_live
SOCKET_ADAPTER=redis
REDIS_URL=...
PM2_INSTANCES=2
```

## Related

- `docs/deployment-production-edge.md`
- `docs/backup-runbook.md`
- `docs/restore-runbook.md`
