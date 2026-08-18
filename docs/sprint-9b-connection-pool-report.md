# Sprint 9B — Connection Pool Report

**Verdict:** PASS

## Configuration

| Setting | Value |
|---------|-------|
| Prisma pool (from URL) | {"connection_limit":null,"pool_timeout":null,"connect_timeout":null} |
| Postgres max_connections | 100 |
| Active connections | 27 |
| DB ping (ms) | 12 |

## Implementation

- `apps/backend/src/lib/database-url.ts` — merges `connection_limit`, `pool_timeout`, `connect_timeout`
- `apps/backend/src/db/prisma.ts` — uses built URL
- Default `DATABASE_CONNECTION_LIMIT=25`

## Bottleneck analysis

1. **Burst fan-out** — unbatched 500+ parallel client opens exhaust local ephemeral ports (Sprint 9 full run).
2. **Long scheduler work** — previously held Prisma pool connection inside advisory-lock transaction; fixed via dedicated `pg` pool in `scheduler-lock.ts`.
3. **Multi-instance** — sum of per-process limits must stay below Postgres `max_connections`.

## Concurrency (batched)

### 250 users (batch 50)
- p95: 27 ms
- hard errors (status 0): 0
- verdict: PASS

### 500 users (batch 50)
- p95: 28 ms
- hard errors (status 0): 0
- verdict: PASS

### 1000 users (batch 50)
- p95: 32 ms
- hard errors (status 0): 0
- verdict: PASS


## Recommendations

- Use PgBouncer when running ≥3 API replicas
- Set `DATABASE_CONNECTION_LIMIT = floor((max_connections - 20) / instances)`
- Terminate TLS at Nginx; keep-alive aligned with `HTTP_KEEP_ALIVE_TIMEOUT_MS`
