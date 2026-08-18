# Pilot Operations — Minimum Monitoring Runbook

**Audience:** Ops (primary), Engineering (incident-only)  
**Cadence:** Every business morning before onboarding or transaction work  
**Target duration:** ~5 minutes  
**Environment:** Production `https://workspace.demaxtore.com`

> This runbook documents **manual pilot controls** for Customer #1. Automatic alerting is **not** currently configured. Operators must run these checks deliberately.

---

## 1. Quick health (API alive + dependencies)

```bash
curl -fsS https://workspace.demaxtore.com/api/healthz | jq .
curl -fsS https://workspace.demaxtore.com/api/ready | jq .
```

**PASS when:**
- `healthz.status` = `"ok"`
- `ready.ready` = `true`
- `ready.checks` all mandatory values = `"up"` (`db`, `redis`, `storage`, `socketAdapter`, `safetyGates`)
- `email` may be `"up"` or `"degraded"` (degraded does **not** block readiness)

**FAIL / STOP onboarding when:**
- `ready.ready` = `false` or HTTP 503
- Any mandatory check = `"down"`

**Owner:** OPS  
**Escalate to:** ENGINEERING if not recovered within 15 minutes during active transaction hours

---

## 2. Backend service

```bash
systemctl is-active demaxtore-workspace-backend.service
systemctl status demaxtore-workspace-backend.service --no-pager | head -15
```

**PASS:** `active (running)`  
**FAIL:** `failed`, `activating` loop, or repeated restarts (`NRestarts` climbing)

**Owner:** OPS → ENGINEERING  
**Action:** Check `/var/log/demaxtore-node-backend.log` tail; restart only per engineering playbook if needed

---

## 3. Backup freshness (CRITICAL)

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main
bash scripts/backup-status.sh
```

**PASS when output includes:**
- `FRESH ageHours=... thresholdHours=26.0`
- Latest successful backup `status: SUCCESS` from today's or yesterday's 02:00 run
- `databaseArtifact` + `uploadsArtifact` present in `outDir`

**STOP NEW ONBOARDING when:**
- Output contains `STALE` (age > 26 hours)
- No `latest-success.json`
- Latest `last-run.json` shows `FAILED` for the most recent unattended 02:00 run

**Two consecutive unattended backup failures → STOP NEW ONBOARDING**

Manual check procedure:
```bash
grep 'Finished' /var/log/demaxtore-backup.log | tail -5
```
If the last **two** lines containing `02:00` (unattended schedule) are both `FAILED`, stop onboarding and escalate.

**Owner:** OPS  
**Escalate to:** ENGINEERING (INFRA)  
**Note:** `backup-status.sh` prints `STALE` but currently exits `0`. Ops must read output — do not rely on exit code alone.

---

## 4. Disk capacity

```bash
df -h /
du -sh /var/www/demaxtore/DemaxtoreSolitions-main/.data/backups
du -sh /var/www/demaxtore/DemaxtoreSolitions-main/apps/backend/.data/uploads
```

**PASS:** Root filesystem < 85% used with comfortable headroom  
**WARN:** > 85% — escalate before next transaction upload burst  
**STOP:** > 95% or uploads/backup failing with disk errors

**Owner:** OPS → INFRA/ENGINEERING

---

## 5. Login smoke (optional but recommended on Day-0)

```bash
# Use seeded ops account only — do not use customer credentials
curl -sS -X POST https://workspace.demaxtore.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demaxtore.local","password":"***"}' | jq '.user.role'
```

**PASS:** HTTP 200 + expected role  
**FAIL:** 503 (often Redis/rate-limit infra), persistent 401, or 5xx

---

## 6. Control Tower attention (transaction ops visibility)

1. Log in as Admin/Ops at `https://workspace.demaxtore.com`
2. Open **Operations center** (`/operations`) or **Import Control Tower** (`/sales/control-tower`)
3. Confirm page loads (not blank / error state)
4. Review attention items, exceptions, open alerts

API spot-check (authenticated):
```bash
# After obtaining admin bearer token:
curl -fsS -H "Authorization: Bearer $TOKEN" \
  https://workspace.demaxtore.com/api/control-tower/ops-dashboard | jq '.overview.openAlerts'
```

**Owner:** OPS (commercial/transaction context)  
**Escalate to:** ENGINEERING only if page/API 5xx or data integrity concern

---

## 7. Incident classification (pilot)

### STOP NEW ONBOARDING
- Backup stale > 26h
- Two consecutive unattended (02:00) backup failures
- `/api/ready` not ready (DB/Redis/storage down)
- Persistent backend restart loop
- Suspected cross-tenant or security exposure

### STOP ACTIVE TRANSACTION / ESCALATE IMMEDIATELY
- Data integrity risk on live transaction
- Document/POD loss or corruption
- Customer-visible wrong-tenant data
- Unexplained mutation of transaction state

### ENGINEERING INCIDENT-ONLY
Engineering does **not** own daily monitoring. Engage only on P0 or explicit Ops escalation.

---

## 8. Known accepted pilot risks (do not confuse with monitoring PASS)

| Risk | Status |
|---|---|
| Off-host backup | **OPEN P1** — total host loss can destroy live data and local backups |
| Supplier branding asset IDOR | **OPEN P1** (Phase 5) — not a monitoring issue |
| No automatic alert delivery | **OPEN P1** — this runbook is the compensating control |

---

## 9. Repeatable validation script

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main
bash scripts/phase-14-monitoring-validation.sh
```

Optional authenticated smoke:
```bash
PHASE14_ADMIN_EMAIL=admin@demaxtore.local \
PHASE14_ADMIN_PASSWORD='***' \
bash scripts/phase-14-monitoring-validation.sh
```

---

*Last updated: Phase 14 validation — 17 August 2026*
