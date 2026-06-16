# Production Edge Deployment (Sprint 9B)

Reference architecture for running DeMaxtore behind Nginx. **Not deployed automatically** from CI.

## Components

| Tier | Role | Notes |
|------|------|-------|
| Nginx | TLS termination, reverse proxy, gzip | See `deploy/nginx/demaxtore.conf.example` |
| Backend × N | Express + Socket.io + schedulers | `DATABASE_CONNECTION_LIMIT` per instance |
| Frontend | Static or Vite preview | Serves SPA; API via `/api` proxy |
| PostgreSQL | Primary datastore | `max_connections` must exceed sum of all pool limits + scheduler pool |
| Optional PgBouncer | Connection pooling | Recommended for >2 API replicas |

## Environment (backend)

| Variable | Suggested production |
|----------|---------------------|
| `NODE_ENV` | `production` |
| `DATABASE_CONNECTION_LIMIT` | `15`–`25` per instance |
| `DATABASE_POOL_TIMEOUT_SEC` | `20` |
| `JOB_STALE_RUNNING_MS` | `1800000` (30 min) |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | `65000` (align with Nginx) |
| `CORS_ORIGIN` | Public app origin |
| `COOKIE_DOMAIN` | Parent domain if subdomains share cookies |

## Timeouts

- Nginx `proxy_read_timeout` ≥ longest API request (120s default in example).
- Node `server.requestTimeout` matches `HTTP_REQUEST_TIMEOUT_MS` in `server.ts`.
- Socket.io location uses longer read timeout (3600s).

## Multi-instance checklist

1. Run 2+ backends on different ports; add upstream entries.
2. Set `SOCKET_ADAPTER=redis` + `REDIS_URL` for cross-instance Socket.io (Sprint D).
3. Alternatively enable **sticky sessions** for `/socket.io/` when using `SOCKET_ADAPTER=memory`.
4. Confirm `job_executions` rows with `SKIPPED` when second instance ticks schedulers.
5. Shared storage via `STORAGE_PROVIDER=s3` (or NFS for local) required for attachments across replicas.
6. Use `GET /api/ready` on load balancer health checks before sending traffic.

See also: `docs/sprint-d-production-hardening.md`

## Security headers

Configured in example: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Add HSTS at TLS layer when stable.

## Related

- `docs/backup-runbook.md`
- `docs/restore-runbook.md`
- `docs/sprint-9b-reverse-proxy-readiness-report.md`
