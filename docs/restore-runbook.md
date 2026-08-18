# DeMaxtore — Restore Runbook

**Sprint 3.9** — Disaster recovery steps.

---

## Prerequisites

- Maintenance window announced
- Valid `dmx-*.dump` and `dmx-uploads-*.tar.gz`
- Clean PostgreSQL instance (or empty database `dmx`)

---

## 1. Stop application

```bash
supervisorctl stop dmx-backend
# or kill node process on PORT 8001
```

---

## 2. Restore PostgreSQL

```bash
# Drop/recreate database (destructive)
dropdb dmx && createdb dmx

pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --jobs=4 \
  dmx-YYYYMMDD-HHMMSS.dump
```

Apply migrations if dump is older than current schema:

```bash
cd apps/backend && npx prisma migrate deploy
```

State guard is included in migration `20260606120000_sprint39_state_guard` — no manual `psql -f` required after 3.9.

---

## 3. Restore uploads

```bash
export STORAGE_DIR="/var/dmx/uploads"
rm -rf "${STORAGE_DIR}.bak"
mv "$STORAGE_DIR" "${STORAGE_DIR}.bak" 2>/dev/null || true
mkdir -p "$(dirname "$STORAGE_DIR")"
tar -xzf dmx-uploads-YYYYMMDD.tar.gz -C "$(dirname "$STORAGE_DIR")"
```

---

## 4. Start application

```bash
cd apps/backend && npx prisma generate
supervisorctl start dmx-backend
curl -s http://localhost:8001/api/healthz
```

---

## 5. Validation (restore test)

| Check | Command / action |
|-------|------------------|
| Health | `GET /api/healthz` → `db: up` |
| Login | Seed user `buyer1@acme.test` / `Passw0rd!` |
| State guard | `yarn test src/hardening/state-guard.test.ts` |
| Smoke E2E | `npx playwright test tests/01-auth.spec.ts` |

Document restore date and dump filename in operator log.

---

## 6. Disaster recovery summary

| Step | Order |
|------|-------|
| Stop app | 1 |
| Restore DB | 2 |
| `migrate deploy` | 3 |
| Restore files | 4 |
| Start app | 5 |
| Validate | 6 |

**RTO target (pilot):** operator-dependent; plan for 1–2 hours with rehearsed runbook.
