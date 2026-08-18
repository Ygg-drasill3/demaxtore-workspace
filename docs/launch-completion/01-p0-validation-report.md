# P0 Validation Report

**Date:** 2026-06-17  
**Environment:** Staging (local DB `demaxtore` @ 127.0.0.1:5432)  
**Script:** `./scripts/production-p0-validate.sh`  
**Log:** [`p0-validation-log.txt`](p0-validation-log.txt)

---

## Verdict: **FAIL** (3 blockers for production NODE_ENV)

P0 pilot with flags OFF is **technically sound** (tests, desync gate, migrations). Production-secret and ops automation gaps block a **production** NODE_ENV sign-off.

---

## Check matrix

| Check | Result | Evidence |
|-------|--------|----------|
| Contracts tests | **PASS** | 109/109 |
| Backend vitest | **PASS** | 72/72 |
| Backend typecheck | **PASS** | `tsc --noEmit` clean |
| Undocumented desync | **PASS** | `undocumentedDesyncCount: 0` (1 documented pair) |
| Desync script exit gate | **FAIL** | `production-p0-validate.sh` uses `require()` on JSON file — false negative; audit JSON itself is valid |
| `JWT_SECRET` | **PASS** | Set |
| `JWT_REFRESH_SECRET` | **PASS** | Set |
| `DATABASE_URL` | **PASS** | Set |
| `PAYMENT_WEBHOOK_SECRET` | **FAIL** | Not set in `apps/backend/.env` |
| `CARRIER_WEBHOOK_SECRET` | **FAIL** | Not set in `apps/backend/.env` |
| Prisma migrations | **PASS** | 42 migrations, schema up to date |
| Backup cron | **FAIL** | No `backup-cron.example.sh` entry in crontab (only unrelated SSL job) |
| Health `/api/healthz` | **PASS** | `http://127.0.0.1:3001/api/healthz` → 200 |
| Health `/api/ready` | **PASS** | DB up, storage up, email up |

---

## Desync audit summary

- Orders scanned: 121  
- Documented desync: 1 (`ORD-RFQ-2026-0055-78c8680d`)  
- Undocumented desync: **0**

---

## Remediation before production NODE_ENV

1. Set `PAYMENT_WEBHOOK_SECRET` and `CARRIER_WEBHOOK_SECRET` (≥32 chars) in staging/prod `.env`
2. Schedule `scripts/backup-cron.example.sh` in crontab
3. Fix `production-p0-validate.sh` JSON gate to use `fs.readFileSync` + `JSON.parse` (ops script bug)

---

## P0 pilot (flags OFF) sub-verdict

| Scope | Verdict |
|-------|---------|
| Code + data gates | **PASS** |
| Production env secrets + backup automation | **FAIL** |
