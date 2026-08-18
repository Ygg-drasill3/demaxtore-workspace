# Integration Hardening — Phase F Report (Cutover)

**Status:** ✅ Complete
**Date:** 2026-06-02
**Cutover result:** New Node backend on **8001**, Vite on **3000**, legacy retired (not deleted).

---

## Cutover sequence (executed)

1. **Stopped legacy supervisor processes** (code preserved; only the processes were stopped):
   ```
   sudo supervisorctl stop backend frontend
   → backend: stopped
   → frontend: stopped
   ```
   Legacy code still on disk at:
   - `/app/backend/`              (FastAPI source — retained, not deleted)
   - `/app/frontend/`             (React CRA source — retained, not deleted)
   - `/app/legacy/sprint-1-demo-shell/` (Phase A archive)

2. **Killed the dev `tsx watch` on 8002** so the port is freed.

3. **Updated env files**:
   ```diff
   apps/backend/.env
   - PORT=8002
   + PORT=8001
   ```
   ```diff
   apps/frontend/.env  (new)
   + VITE_API_URL=http://localhost:8001/api
   + VITE_SOCKET_URL=http://localhost:8001
   + VITE_APP_NAME=DeMaxtore
   ```

4. **Updated `vite.config.ts`** to bind 0.0.0.0:3000 (was localhost:5173 with proxy to non-existent :4000):
   ```ts
   server: { host: "0.0.0.0", port: 3000, strictPort: true }
   ```

5. **Added supervisor configs** at `/etc/supervisor/conf.d/`:
   - `supervisord_dmx_backend.conf`  → `yarn dev` in `/app/apps/backend` (priority 20)
   - `supervisord_dmx_frontend.conf` → `yarn dev` in `/app/apps/frontend` (priority 30)

6. **Reread + update + autostart**:
   ```
   sudo supervisorctl reread && sudo supervisorctl update
   → dmx-backend  RUNNING
   → dmx-frontend RUNNING
   ```

---

## Smoke tests (all green)

```
✓  GET  http://localhost:8001/api/healthz
   → 200 {status:"ok", db:"up", uptimeSec:37, timestamp:"…"}

✓  GET  http://localhost:3000/
   → 200 (Vite dev server serving DeMaxtore React shell with HMR)

✓  POST http://localhost:8001/api/auth/login (admin@demaxtore.local / Passw0rd!)
   → 200 user.role=ADMIN; refresh cookie scoped to /api/auth set

✓  GET  http://localhost:8001/api/auth/me (Bearer)
   → 200 admin@demaxtore.local

✓  POST http://localhost:8001/api/auth/refresh (cookie)
   → 200 new accessToken issued (rotation)

✓  GET  http://localhost:8001/api/rfq?limit=5 (buyer1)
   → 200 5 items: RFQ-2026-0008 (RFQ_OPEN), 0007 (RFQ_OPEN), 0006 (RFQ_SUBMITTED),
                  0005 (RFQ_SUBMITTED), 0004 (CANCELLED)

✓  Phase E live socket scenario re-run against :8001
   apps/backend/scripts/phase-e-socket-test.mjs
   → "✅ PHASE E SOCKET SCENARIO PASSED"
   → supplier.notification:new   = true
   → supplier.timeline:new       = true
   → supplier.workspace:update   = true
   → admin.timeline:new          = true
```

---

## Supervisor status (post-cutover)

```
backend                  STOPPED  Jun 02 02:28 PM    ← legacy (retired)
frontend                 STOPPED  Jun 02 02:28 PM    ← legacy (retired)
dmx-backend              RUNNING  pid 18280          ← new Node/Express
dmx-frontend             RUNNING  pid 18234          ← new Vite
mongodb                  RUNNING  (kept; not used by new stack — Phase G can decide)
postgres                 FATAL    (own supervisor entry fails because Debian's
                                   pg cluster already owns :5432 — actual Postgres
                                   IS up via /usr/lib/postgresql/15)
code-server              RUNNING
nginx-code-proxy         RUNNING
```

> The `postgres` supervisor entry is in FATAL because Postgres is already running via the system's Debian package on port 5432. The new backend connects fine (`✓ Database connection ok` in `dmx-backend.out.log`). Leaving this is intentional — flipping it could destabilise the system. The Debian package boots Postgres on container start, which is what we want.

---

## File map (Phase F — created / modified)

```
apps/backend/.env                                      ✎ PORT 8002 → 8001
apps/frontend/.env                                     + new (VITE_API_URL/SOCKET/NAME)
apps/frontend/vite.config.ts                           ✎ host:0.0.0.0, port:3000, strictPort, no proxy
apps/backend/scripts/phase-e-socket-test.mjs           ✎ BASE → http://localhost:8001

/etc/supervisor/conf.d/supervisord_dmx_backend.conf    + new supervisor entry
/etc/supervisor/conf.d/supervisord_dmx_frontend.conf   + new supervisor entry

/app/memory/PRD.md                                     ✎ updated with Phase F + current architecture
docs/integration-hardening-phase-f-report.md           + this file
```

Net: 6 file changes. Zero deletions. Legacy code intact for rollback.

---

## Rollback plan (if ever needed)

```bash
sudo supervisorctl stop dmx-backend dmx-frontend
sudo supervisorctl start backend frontend
# Backend back on 8001 (FastAPI/Mongo), frontend back on 3000 (CRA).
# Followed by reverting apps/backend/.env PORT to 8002 if you want to keep the
# new Node backend running side-by-side for debugging.
```

The legacy supervisor entries (`backend`, `frontend`) live in the read-only
`/etc/supervisor/supervisord.conf` — they're permanent and recoverable.

---

## What's deliberately untouched

- **Sprint 2.5 UI components** — already shipped in `apps/frontend/src/`. They're now talking to the live REST + Socket.io endpoints via the env vars set in this phase.
- **Frontend routing / screens** — page-level wiring (e.g. WorkspaceRoute → useWorkspaceSocket) is unchanged; it was already pointing at the helpers that read `VITE_API_URL` / `VITE_SOCKET_URL`.
- **No new endpoints, no new business logic.** Cutover is infrastructure-only.

---

## Phase F acceptance criteria (from your brief)

| Criterion | Status |
|---|---|
| Legacy silinmedi, sadece emekliye ayrıldı | ✅ Code on disk, supervisor entries stopped |
| Yeni Node backend 8001 üzerinde /api/health 200 verdi | ✅ `/api/healthz` 200 + db:"up" |
| Vite 3000 üzerinde açıldı | ✅ HTTP 200 + React shell + HMR |
| Login + refresh + /me çalıştı | ✅ All 3 verified end-to-end |
| RFQ workspace gerçek REST + Socket ile çalıştı | ✅ Buyer→Admin→Supplier socket scenario PASSED on :8001 |
| Cutover sonrası smoke test geçti | ✅ All green |

---

## Ready for Phase G

Smoke tests green. Phase G can begin when approved.

**Phase G scope (proposed):**
- Attachment upload (multer) for `POST /api/rfq/:id/attachments`
- Email delivery (forgot-password + proforma SLA reminder) — wire to Resend or similar
- Telemetry events ingest (`POST /api/telemetry`) — write to `telemetry_events`
- Idempotency middleware → switch to write-through INSERT-ON-CONFLICT pattern
- Frontend polish: surface `notification:new` toast + workspace timeline live update in the Sprint 2.5 components
