# DeMaxtore — Postgres & Uploads Backup Runbook

**Sprint 3.9** — Operations hardening (no automation in repo).

---

## Prerequisites

- `DATABASE_URL` for target environment
- `STORAGE_DIR` path (default `/var/dmx/uploads`)
- Shell access to DB host and app server
- Sufficient disk for dumps + file archive

---

## 1. PostgreSQL logical backup

```bash
export DATABASE_URL="postgresql://USER:PASS@HOST:5432/dmx"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --file="dmx-$(date +%Y%m%d-%H%M%S).dump"
```

Verify:

```bash
pg_restore --list dmx-YYYYMMDD-HHMMSS.dump | head
```

---

## 2. Uploads backup

```bash
export STORAGE_DIR="/var/dmx/uploads"
tar -czf "dmx-uploads-$(date +%Y%m%d).tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
```

---

## 3. Environment backup

Store securely (secrets manager, not git):

- `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `EMAIL_PROVIDER`, `RESEND_API_KEY` or `SMTP_*`
- `STORAGE_DIR`, `CORS_ORIGIN`, `APP_BASE_URL`

```bash
# Example: encrypted archive on operator workstation
gpg -c .env.production
```

---

## 4. Schedule (recommended)

| Asset | Frequency | Retention |
|-------|-----------|-----------|
| Postgres dump | Daily | 30 days |
| Uploads tar | Daily | 30 days |
| Env snapshot | On change | Last 5 versions |

---

## 5. Pre-pilot checklist

- [ ] One successful `pg_dump` recorded
- [ ] One successful uploads `tar`
- [ ] Backup location off-server (S3/NAS)
- [ ] Restore drill scheduled (see `restore-runbook.md`)
