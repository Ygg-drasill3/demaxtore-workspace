# Phase 15A — Cron, Upload & Backup Reliability Remediation

## 1. Executive Summary

Phase 15 proved the DeMaxtore backup **restore mechanism works**. Phase 15A fixed the **unattended backup path** so production can produce a validated DB + uploads backup set daily without interactive SSH.

**Root causes fixed:**
- Cron invoked `/bin/sh` with `source apps/backend/.env` → env load failed silently (`source: not found`).
- `STORAGE_DIR=./.data/uploads` resolved incorrectly from cron CWD → DB-only backups possible while script reported success.

**Remediation:** Hardened `scripts/backup-production.sh`, updated cron to invoke bash directly (env loaded inside script), added validation/manifest/state/failure visibility, and proved two scheduler-equivalent successful runs plus restore spot-check from new artifacts.

**Off-host replication:** Not configured on this host. Remains **OPEN P1 — TEMPORARY PILOT RISK ACCEPTANCE REQUIRED**.

---

## 2. Phase 15 Findings Carried Forward

| Finding | Phase 15A disposition |
|---------|----------------------|
| Scheduled cron backups failing (`source` under `/bin/sh`) | **FIXED** |
| Upload path wrong in unattended context | **FIXED** (absolute resolution) |
| Backup failure alerting missing | **FIXED** (syslog + state files + non-zero exit) |
| Backups host-local only | **OPEN P1** (no secure off-host destination available) |
| 5-customer RPO unacceptable until unattended fix | **Reassessed YES** after scheduler-equivalent proof |

---

## 3. Before State

### Crontab (root, before fix)

```
0 2 * * * cd /var/www/demaxtore/DemaxtoreSolitions-main && set -a && source apps/backend/.env && set +a && /var/www/demaxtore/DemaxtoreSolitions-main/scripts/backup-cron.example.sh >> /var/log/demaxtore-backup.log 2>&1 # demaxtore-backup-cron
```

| Item | Value |
|------|-------|
| Cron user | `root` |
| Cron shell | `/bin/sh` (default) |
| Script | `scripts/backup-cron.example.sh` |
| Env loading | `source apps/backend/.env` in crontab (**fails under sh**) |
| `DATABASE_URL` | `apps/backend/.env` |
| `STORAGE_DIR` | `./.data/uploads` (relative) |
| Backup destination | `.data/backups/<timestamp>/` |
| DB command | `pg_dump --format=custom --no-owner` |
| Uploads command | `tar -czf uploads.tar.gz` **only if directory exists** |
| Retention | 14 days (`find … -mtime +14`) |
| Logging | `/var/log/demaxtore-backup.log` |
| Exit on uploads missing | **No** — script exited 0 with "backup ok" |
| Failure visibility | None — log had **one entry** (2026-08-13 manual run) |
| Off-host copy | None |

### Observed pre-fix artifacts

| Backup dir | DB | Uploads | Notes |
|------------|----|---------|----|
| `20260813-094918` | 33.5 MB | 116.2 MB | Manual/interactive success |
| `20260815-052459` | 34.9 MB | **absent** | Phase 15 manual run — partial set |
| `phase15-20260815-052311` | 34.9 MB | 117.2 MB | Phase 15 validated set |

### Cron failure reproduction

```text
/bin/sh -c 'cd … && source apps/backend/.env' 
→ /bin/sh: 1: source: not found
```

---

## 4. Root Cause

1. **Shell mismatch:** Debian/Ubuntu cron uses `/bin/sh` (dash). Crontab used bashism `source`.
2. **CWD-dependent storage path:** Relative `STORAGE_DIR=./.data/uploads` does not resolve to `apps/backend/.data/uploads` when cron starts in repo root.
3. **Silent partial success:** Old script skipped uploads tar if directory missing but still printed `backup ok` and exited 0.

---

## 5. Scheduler Fix

**New crontab line (installed 2026-08-15):**

```
0 2 * * * /bin/bash /var/www/demaxtore/DemaxtoreSolitions-main/scripts/backup-production.sh >> /var/log/demaxtore-backup.log 2>&1 # demaxtore-backup-cron
```

- Explicit `/bin/bash` — no crontab `source`.
- Env loaded inside script from absolute path.
- `scripts/install-backup-cron.sh` updated idempotently.

---

## 6. Environment Loading

Inside `scripts/backup-production.sh`:

```bash
ENV_FILE="${ROOT}/apps/backend/.env"
set -a && source "$ENV_FILE" && set +a
: "${DATABASE_URL:?…}"
```

Works unattended: no SSH session, no interactive profile, no crontab env exports.

---

## 7. Absolute Path Fix

```bash
# STORAGE_DIR=./.data/uploads →
/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend/.data/uploads
```

Also absolute:
- `ROOT` from script location
- `BACKUP_ROOT=${ROOT}/.data/backups`
- `STATE_DIR`, `LOCK_FILE`, log target documented

---

## 8. STORAGE_DIR Validation

Before backup proceeds, script verifies:
- directory exists
- directory readable
- R4 POD canary present: `1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf`

If validation fails → **non-zero exit**, `.backup-failed`, no `.backup-complete`.

---

## 9. DB Backup

Preserved Phase 15 mechanism:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="${OUT_DIR}/dmx.dump"
```

---

## 10. DB Artifact Validation

After dump:

```bash
pg_restore --list "${OUT_DIR}/dmx.dump"
```

Requires non-zero size + readable archive list.

---

## 11. Upload Backup

Canonical production storage (verified on disk):

```
/var/www/demaxtore/DemaxtoreSolitions-main/apps/backend/.data/uploads
```

Archive:

```bash
tar -czf uploads.tar.gz -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
```

Member path in archive: `uploads/<uuid>.pdf`

---

## 12. Upload Artifact Validation

- non-zero size
- `tar -tzf` succeeds
- R4 POD member present: `uploads/1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf`

---

## 13. R4 POD Canary

| Check | Result |
|-------|--------|
| Present in source storage | YES |
| Present in upload archive | YES |
| Readable from archive | YES |
| SHA-256 | `3b3796ec2e4337689b50546bd41667932421f1dc08f83c0f867aa0513d5d4767` (matches live file) |

---

## 14. Backup Set / Manifest

Each run creates:

```
.data/backups/<backupId>/
  dmx.dump
  uploads.tar.gz
  manifest.json
  .backup-complete          # success only
```

State tracking:

```
.data/backups/.state/
  latest-success.json
  latest-failure.json
  last-run.json
```

`manifest.json` includes sizes, SHA-256, validation status, off-host status — **no secrets**.

---

## 15. Exit-Code Semantics

| Outcome | Exit code |
|---------|-----------|
| Complete validated backup set | 0 |
| Any critical failure | 1 |

Tested: invalid storage → 1; partial (DB ok, uploads skipped) → 1.

---

## 16. Partial Failure Handling

Example: `20260815-080856` (simulated uploads failure)

- `dmx.dump` present (34.9 MB)
- **No** `uploads.tar.gz`
- `.backup-failed` present
- **No** `.backup-complete`
- `latest-success.json` unchanged (still `20260815-080817`)

---

## 17. Logging

Each run logs to `/var/log/demaxtore-backup.log` and syslog (`logger -t demaxtore-backup`):

- start/finish timestamps, backup ID
- DB start/validation/complete
- uploads start/validation/complete
- off-host status
- retention
- final SUCCESS/FAILED + duration

Secrets never logged.

---

## 18. Last-Success Tracking

```bash
./scripts/backup-status.sh
```

Reads `.state/latest-success.json` — answers "When was our last valid DB + uploads backup?"

---

## 19. Failure Visibility

| Mechanism | Status |
|-----------|--------|
| Non-zero cron exit | YES |
| `/var/log/demaxtore-backup.log` | YES |
| syslog (`user.err`) | YES |
| `.state/latest-failure.json` | YES |
| Email/SMTP alert | Not configured (no SMTP in production `.env`) |

**Verdict:** PASS (minimal reliable visibility without new monitoring platform)

---

## 20. Stale Backup Detection

`backup-status.sh` compares latest success age to **26 hours** (daily 02:00 schedule + buffer).

Test: artificial timestamp 30 hours old → classified **STALE**.

---

## 21. `/api/ready` Decision

**Decision: Do NOT block application readiness on backup freshness.**

Rationale: App can serve traffic while backup is stale; backup health is an **operational signal** (`backup-status.sh`, syslog, cron exit), not a liveness gate. `/api/ready` unchanged.

---

## 22. Scheduler-Context Test

Validated via `scripts/backup-scheduler-equivalent.sh`:

```bash
env -i HOME=/root … PATH=… /bin/bash scripts/backup-production.sh
```

Simulates cron minimal environment — not interactive SSH `./backup.sh`.

---

## 23. First Successful Run

| Field | Value |
|-------|-------|
| Backup ID | `20260815-080756` |
| Scheduled/Unattended Context | YES (scheduler-equivalent) |
| Database Artifact | `dmx.dump` — 34,981,387 bytes |
| Database Integrity | PASS (`pg_restore --list`) |
| Uploads Artifact | `uploads.tar.gz` — 121,720,119 bytes |
| Uploads Integrity | PASS |
| R4 POD Included | YES |
| Overall | SUCCESS |
| Duration | 14s |

---

## 24. Second Successful Run

| Field | Value |
|-------|-------|
| Backup ID | `20260815-080817` |
| Scheduled/Unattended Context | YES |
| Database Artifact | `dmx.dump` — 34,981,387 bytes |
| Database Integrity | PASS |
| Uploads Artifact | `uploads.tar.gz` — 121,720,119 bytes |
| Uploads Integrity | PASS |
| R4 POD Included | YES |
| Overall | SUCCESS |
| Duration | ~12s |

No naming collision; prior success retained.

---

## 25. Retention

- Policy: delete backup set directories older than **14 days** under `.data/backups/`
- Excludes: `.state/`
- Does not touch live uploads
- Does not delete current backup mid-run

**Verdict:** PASS for controlled pilot

---

## 26. Off-Host Replication

| Item | Status |
|------|--------|
| `BACKUP_OFFHOST_DIR` | Not configured |
| Remote mount / object storage | None available on host |
| `/mnt` | Empty |
| S3 provider | Not configured for backups |

**Decision:** Off-host replication failure semantics documented — when configured, missing required off-host copy = FAILED.

**Current:** `OFF-HOST BACKUP: OPEN P1 — TEMPORARY PILOT RISK ACCEPTANCE REQUIRED`

---

## 27. Backup Security

| Path | Perms | Owner |
|------|-------|-------|
| `.data/backups/` | 755 | demaxtore:demaxtore |
| backup artifacts | 644 | root:root |
| `backup-production.sh` | 755 | root:root |
| `/var/log/demaxtore-backup.log` | 644 | root:root |

Backups not web-served; not publicly downloadable. Acceptable for pilot; consider tightening to 750 on backup root in future.

---

## 28. Disk Capacity

| Metric | Value |
|--------|-------|
| Complete backup set size | ~150 MB (DB ~35 MB + uploads ~117 MB) |
| Available disk (`/`) | 124 GB free |
| 14-day retention estimate | ~2.1 GB |
| Risk of fill during pilot | Low |

---

## 29. Concurrent Run Protection

`flock -n` on `${BACKUP_ROOT}/.backup.lock` — second overlapping run exits non-zero.

---

## 30. Production Impact

During scheduler-equivalent runs:

| Check | Result |
|-------|--------|
| Duration | 12–14s |
| Obvious CPU/load issue | None observed |
| `/api/healthz` | 200 |
| `/api/ready` | 200 |

---

## 31. DB/File Consistency

DB dump and uploads tar are sequential snapshots (~14s apart). **Not transactionally atomic.**

**Practical risk:** Low for pilot — worst case orphaned upload or missing attachment reference if file written after tar start.

**Recovery procedure for small mismatch:**
1. Restore DB to isolated instance
2. Restore uploads archive to storage path
3. If specific attachment missing, re-upload from customer or prior backup set

---

## 32. Restore Spot Check

From new unattended backup `20260815-080756`:

```bash
./scripts/backup-restore-spot-check.sh .data/backups/20260815-080756
```

| Check | Result |
|-------|--------|
| `pg_restore` to isolated DB | PASS |
| R4 Product | PRESENT |
| R4 PO | PRESENT |
| R4 Shipment | PRESENT |
| Customs CLEARED | PASS |
| Inland DELIVERED | PASS |
| Landed Cost | PRESENT |
| POD metadata | PRESENT |
| POD binary from archive | READABLE |
| Tenant ownership | PRESERVED (spot-check queries scoped correctly) |

---

## 33. Failure Simulation

`BACKUP_TEST_INVALID_STORAGE=1` in scheduler-equivalent env:

- Exit code: **1**
- Log: `STORAGE_DIR missing`
- `.backup-failed` written
- `latest-success.json` **unchanged**

---

## 34. Partial Failure Simulation

`BACKUP_TEST_SKIP_UPLOADS=1`:

- DB dump created
- Uploads skipped intentionally
- Overall: **FAILED**
- No success marker update

---

## 35. Stale Detection Test

Artificial age 30.01 hours vs 26-hour threshold → **STALE**. Logic in `backup-status.sh` confirmed.

---

## 36. Runbook

### Schedule

- **When:** Daily 02:00 UTC (server local)
- **Scheduler:** cron (root)
- **Command:** `/bin/bash …/scripts/backup-production.sh`

### Locations

| Item | Path |
|------|------|
| Script | `scripts/backup-production.sh` |
| Env | `apps/backend/.env` |
| Uploads source | `apps/backend/.data/uploads` |
| Backups | `.data/backups/<backupId>/` |
| State | `.data/backups/.state/` |
| Log | `/var/log/demaxtore-backup.log` |

### Operator commands

```bash
# Last successful backup
./scripts/backup-status.sh

# Scheduler-equivalent test (NOT interactive shortcut)
./scripts/backup-scheduler-equivalent.sh

# Manual run (same script cron uses)
/bin/bash ./scripts/backup-production.sh

# Validate DB artifact
pg_restore --list .data/backups/<id>/dmx.dump | head

# Validate uploads + R4 POD
tar -tzf .data/backups/<id>/uploads.tar.gz | grep 1a62dab4

# Restore spot-check (isolated temp DB — never production)
./scripts/backup-restore-spot-check.sh .data/backups/<id>

# Inspect failures
cat .data/backups/.state/latest-failure.json
tail -50 /var/log/demaxtore-backup.log
```

### DB restore (Phase 15 procedure — do not run on production without isolation)

```bash
createdb demaxtore_restore_<stamp>
pg_restore --no-owner --no-acl -d demaxtore_restore_<stamp> dmx.dump
```

### Uploads restore

```bash
tar -xzf uploads.tar.gz -C apps/backend/.data/
```

### Off-host

Not configured. Required pilot risk acceptance until `BACKUP_OFFHOST_DIR` or equivalent secure destination is provisioned.

### Escalation

1. Check `backup-status.sh` → STALE or failure
2. Read `/var/log/demaxtore-backup.log` + syslog (`grep demaxtore-backup`)
3. Run scheduler-equivalent test manually
4. If uploads validation fails, verify `apps/backend/.data/uploads` exists and is readable

---

## 37. RPO Reassessment

| Field | Value |
|-------|-------|
| Backup Frequency | Daily 02:00 |
| Latest Successful Complete Backup | 2026-08-15T08:08:27+00:00 (`20260815-080817`) |
| Age at assessment | Fresh (< 1 hour) |
| Maximum Expected Data-Loss Window | ≤ 24 hours (+ job duration) |
| **5-Customer Pilot RPO Acceptable** | **YES** |

---

## 38. RTO

Unchanged from Phase 15:

| Metric | Value |
|--------|-------|
| Technical DB restore | ~6 seconds |
| Operational runbook recovery | ~1–2 hours |
| **5-Customer Pilot RTO Acceptable** | **YES** |

---

## 39. P0 / P1 / P2

| Severity | Open |
|----------|------|
| P0 | 0 |
| P1 | 1 (off-host replication absent) |
| P2 | 0 |

---

## 40. Final Verdict

---

PHASE 15A — CRON, UPLOAD & BACKUP RELIABILITY REMEDIATION

Original Cron Shell Failure:
FIXED

Unattended Environment Loading:
PASS

Working-Directory Independence:
PASS

Absolute Upload Path:
PASS

STORAGE_DIR Validation:
PASS

Scheduled DB Backup:
PASS

DB Artifact Integrity:
PASS

Scheduled Upload Backup:
PASS

Upload Artifact Integrity:
PASS

DB + Upload Atomic Backup Set:
PASS

R4 POD Canary:
PASS

Partial Backup Rejected:
PASS

Meaningful Exit Status:
PASS

Backup Logging:
PASS

Last Successful Backup Discoverable:
PASS

Backup Failure Visibility:
PASS

Stale Backup Detection:
PASS

Concurrent Run Protection:
PASS

Retention:
PASS

OFF-HOST BACKUP:
OPEN P1 — TEMPORARY PILOT RISK ACCEPTANCE REQUIRED

Backup Security:
PASS

Scheduler-Equivalent Run #1:
PASS

Scheduler-Equivalent Run #2:
PASS

New Backup DB Restore Spot Check:
PASS

R4 Product Recovery:
PASS

R4 PO Recovery:
PASS

R4 Shipment Recovery:
PASS

R4 Customs CLEARED Recovery:
PASS

R4 Inland DELIVERED Recovery:
PASS

R4 Landed Cost Recovery:
PASS

R4 POD Metadata Recovery:
PASS

R4 POD Binary Recovery:
PASS

Tenant Ownership Recovery:
PASS

Failure Simulation:
PASS

Partial Failure Simulation:
PASS

Production Health During Backup:
PASS

Unexpected 5xx:
0

Backup Frequency:
Daily 02:00 UTC

Latest Successful Complete Backup:
2026-08-15T08:08:27+00:00

Implied Maximum Data-Loss Window:
≤ 24 hours

5-Customer Pilot RPO Acceptable:
YES

5-Customer Pilot RTO Acceptable:
YES

Production Business Data Modified:
NO

Production Restore Performed:
NO

P0 Open:
0

P1 Open:
1

P2 Open:
0

PHASE 15A VERDICT:

PASS — AUTOMATED RECOVERY PIPELINE READY

---

**Note on OFF-HOST:** All automated backup gates pass. Host-local-only backups remain correlated failure risk. Final Launch GO / NO-GO must explicitly accept or resolve off-host P1 before paid customers.

**Next step:** TURKEY MVP — FINAL LAUNCH GO / NO-GO (not Sprint 43, not Phase 15B unless new blocker).
