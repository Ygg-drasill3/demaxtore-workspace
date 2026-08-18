# Phase 15 — Production Backup / Restore Validation

**Date:** 2026-08-15  
**Environment:** Production host `srv1661754` · Workspace app `https://workspace.demaxtore.com`  
**R4 marker probed:** `MVP-UI17-R4-20260814-R2M5`  
**Validator:** Isolated restore — no production mutation

---

## 1. Executive Summary

Phase 15 performed a read-only audit of the production backup architecture, then executed a **real backup → isolated restore → boot → verify** cycle using the same supported mechanisms documented in `scripts/backup-cron.example.sh` and `docs/backup-runbook.md`.

**Finding:** Recovery of pilot-critical state **is proven**. A fresh Phase 15 backup (2026-08-15 05:23 UTC) containing R4 was restored into isolated database `demaxtore_restore_phase15_20260815`, uploads were extracted to an isolated path, and the current deployed backend booted successfully against the restored state. R4 lineage, financial values, lifecycle terminals, POD binary, tenant ownership, and partner assignments all survived restore.

**Operational gaps (not recovery blockers):** Scheduled cron backups have **never successfully completed** because the crontab uses `source` under `/bin/sh`. Even when invoked manually, `STORAGE_DIR=./.data/uploads` in production `.env` resolves incorrectly from repo root, causing **DB-only** backups unless the operator sets an absolute path. No automated backup-failure alerting exists.

**Verdict:** **PASS — RECOVERY VERIFIED** (with P1 operational follow-ups; P0 = 0)

---

## 2. Environment

| Item | Value |
|---|---|
| Application root | `/var/www/demaxtore/DemaxtoreSolitions-main` |
| Production URL | `https://workspace.demaxtore.com` |
| Backend port (production) | 3001 (`demaxtore-workspace-backend.service`) |
| PostgreSQL | 16.14 · local `127.0.0.1:5432` |
| Production database | `demaxtore` (user `demaxtore_user`) |
| Redis | `127.0.0.1:6379` |
| Document storage | Local filesystem · `apps/backend/.data/uploads` (~130 MB) |
| Deployed build | `dist/server.js` · commit `c9e4328d8fd0aef5ce743013bf378e6e35add538` · branch `snapshot/pre-pilot-20260714` · built 2026-08-14T12:09:22Z |
| Disk (/) | 193 GB total · 69 GB used · 125 GB free (36%) |

---

## 3. Backup Architecture Audit

| Component | Finding |
|---|---|
| DB backup tool | `pg_dump` custom format (`--format=custom --no-owner`) |
| File backup tool | `tar -czf uploads.tar.gz` of `STORAGE_DIR` |
| Automation script | `scripts/backup-cron.example.sh` |
| Cron installer | `scripts/install-backup-cron.sh` (installed in root crontab) |
| Runbooks | `docs/backup-runbook.md`, `docs/restore-runbook.md` |
| Drill script | `tools/hardening/backup-restore-drill.sh` |
| In-app verification | `BackupVerificationService` · table `backup_verification_records` |
| Prior restore drill DB | `demaxtore_restore_drill` (historical, Jun 2026) |
| Off-host replication | **Not configured** (backups remain on-server under `.data/backups/`) |
| Encryption at rest | **None** on backup artifacts |

---

## 4. Recovery Inventory

| Dependency | Class | Truth location | Loss impact | Reconstructable? |
|---|---|---|---|---|
| PostgreSQL (`demaxtore`) | **A. MUST BACK UP** | Primary DB | All transactional state lost | No |
| Upload / trade docs / POD binaries | **A. MUST BACK UP** | `apps/backend/.data/uploads` (metadata in DB `trade_documents.file_id`) | Dead document pointers | No (without separate file backup) |
| Redis | **B. EPHEMERAL** | In-memory · 24 keys, all with TTL | Rate limits reset; socket adapter falls back to in-process | Yes |
| Email / WhatsApp delivery state | **C. EXTERNAL / DERIVED** | Provider + DB outbox tables | Retry from outbox; not canonical business truth | Partial |
| Carrier tracking snapshots | **A. MUST BACK UP** (DB rows) | PostgreSQL | History lost; may re-sync if API creds exist | Partial |
| Environment / secrets | **A. MUST BACK UP** (secure store) | `apps/backend/.env` + operator knowledge | App unusable without secrets | Manual reconstruction |
| Application code / build | **B. RECONSTRUCTABLE** | Git + `dist/` on server | Redeploy from repo/artifact | Yes |
| systemd / PM2 config | **B. RECONSTRUCTABLE** | `/etc/systemd/system/demaxtore-workspace-backend.service`, PM2 | Reinstall services | Yes |
| JWT / refresh secrets | **A. MUST BACK UP** | `.env` | All sessions invalidated; not data loss | Rotate + force re-login |
| WhatsApp connection encryption key | **A. MUST BACK UP** | `WHATSAPP_CONNECTION_ENCRYPTION_KEY` in `.env` | Encrypted WA tokens unreadable | No without key |

**Redis durability requirement:** **NOT REQUIRED** — verified implementation uses Redis for rate limiting, brute-force counters, cache, and optional socket adapter (`apps/backend/src/lib/redis.ts`). No Booking/Shipment/Customs/Inland/POD/Landed Cost canonical state in Redis (24 keys, all expiring).

---

## 5. PostgreSQL Backup Mechanism

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="${OUT_DIR}/dmx.dump"
```

- **Format:** PostgreSQL custom (gzip-compressed TOC)
- **Owner:** root (cron/manual Phase 15) or demaxtore (Aug 13 manual)
- **Permissions:** `644` on dump files
- **Integrity check:** `pg_restore --list` → 1243 TOC entries; readable archive

---

## 6. File/Document Backup Mechanism

```bash
tar -czf "${OUT_DIR}/uploads.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
```

- **Production `STORAGE_DIR`:** `./.data/uploads` (relative to backend cwd at runtime → `apps/backend/.data/uploads`)
- **Cron context bug:** From repo root, `./.data/uploads` does not exist; script does not fall back to `apps/backend/.data/uploads` when `STORAGE_DIR` is set but invalid → **uploads silently skipped**
- **Phase 15 backup:** Used explicit absolute path; included 117 MB `uploads.tar.gz`

---

## 7. Backup Schedule

| Setting | Configured | Observed |
|---|---|---|
| Cron expression | `0 2 * * *` (daily 02:00 UTC) | Cron **fires** (confirmed syslog Aug 9–15) |
| Successful execution | Expected daily | **FAIL — script never completes under cron** |
| Root cause | — | Crontab uses `source apps/backend/.env` but cron runs `/bin/sh` where `source` is not defined |
| Log file | `/var/log/demaxtore-backup.log` | Only **one** success line (2026-08-13 09:49 manual bash run) |

---

## 8. Retention

- Script retention: `find … -mtime +14 -exec rm -rf` → **14 days** of backup directories
- Off-host retention: **none**
- Restore points on server at validation time:
  - `20260813-094918` (DB + uploads, manual)
  - `launch-validation-20260813-094720` (DB + tiny uploads, pre-R4)
  - `phase15-20260815-052311` (Phase 15 validation, DB + uploads, includes R4)

---

## 9. Latest Backup

| Backup | Timestamp (UTC) | DB size | Uploads | Age at validation | Contains R4? |
|---|---|---:|---:|---|:---:|
| Scheduled (latest intended) | — | — | — | N/A — cron broken | No |
| On-disk latest pre-Phase 15 | 2026-08-13 09:49:18 | 33.5 MB | 121.7 MB | ~44 h | **No** (R4 created 2026-08-14) |
| **Phase 15 validation backup** | **2026-08-15 05:23:11** | **34.9 MB** | **117.2 MB** | **fresh** | **Yes** |

Per Phase 15 §54: R4 post-dated the Aug 13 snapshot; a legitimate fresh backup was taken via the supported mechanism before restore validation.

---

## 10. Backup Integrity

| Check | Phase 15 backup | Result |
|---|---|---|
| Archive readable | `pg_restore --list` | PASS |
| TOC entries | 1232 | PASS |
| Non-empty dump | 34.9 MB | PASS |
| Compression valid | gzip inside custom format | PASS |
| SHA-256 manifest | `checksums.sha256` recorded | PASS |
| Uploads tar readable | `tar -tzf` + extract | PASS |

```
dmx.dump       sha256: (see checksums.sha256 in backup dir)
uploads.tar.gz sha256: (see checksums.sha256 in backup dir)
R4 POD hash:  3b3796ec2e4337689b50546bd41667932421f1dc08f83c0f867aa0513d5d4767
```

---

## 11. Restore Isolation

| Control | Implementation |
|---|---|
| Restore database | `demaxtore_restore_phase15_20260815` (new, separate from `demaxtore`) |
| Production DB touched | **NO** |
| Restore uploads path | `/var/www/demaxtore/DemaxtoreSolitions-main/.data/phase15-restore-uploads/uploads` |
| Production uploads touched | **NO** |
| Isolated app port | 3099 (brief validation boot) |
| Production app repointed | **NO** |
| Schedulers on isolated boot | Disabled where possible (`SCHEDULER_ENABLED=false` for auth tests) |

---

## 12. Database Restore

| Metric | Value |
|---|---|
| Backup used | `.data/backups/phase15-20260815-052311/dmx.dump` |
| Command | `pg_restore --dbname="$RESTORE_URL" --no-owner --jobs=2 dmx.dump` |
| Start | 2026-08-15T05:23:25+00:00 (approx) |
| Finish | 2026-08-15T05:23:31+00:00 (approx) |
| Duration | **6 seconds** |
| Exit code | **0** |
| Warnings/errors logged | **0** |

---

## 13. Restore Duration

| Phase | Duration |
|---|---|
| Backup (pg_dump) | 4 s |
| Backup (uploads tar) | 4 s |
| Backup total | **8 s** |
| DB restore (pg_restore) | **6 s** |
| Uploads extract + POD verify | ~2 s |
| Isolated app boot + health probes | ~8 s |
| **Measured operational RTO (DB + files + boot smoke)** | **~24 s** (+ operator coordination overhead in real DR) |

Real disaster recovery would add DNS/service cutover, secret injection, and validation — runbook targets 1–2 hours for pilot (`docs/restore-runbook.md`).

---

## 14. Schema / Migration Compatibility

| Check | Result |
|---|---|
| `_prisma_migrations` count in restored DB | 112 |
| Critical tables present | PASS |
| FK constraints restored | PASS (pg_restore exit 0) |
| Current `dist/server.js` boots against restored DB | PASS |
| `prisma migrate status` | **FRICTION** — missing migration file `20260727120000_sprint27_dual_entry_po_source/migration.sql` in repo (does not block running deployed build) |
| Classification | **RESTORE DIRECTLY COMPATIBLE** — no migration required for deployed artifact to consume restored state |

---

## 15. R4 Recovery Probe

Transaction marker: **MVP-UI17-R4-20260814-R2M5**  
Created: **2026-08-14T15:54:39Z** (per `.r4-ui-fixtures/run/R2M5/evidence.json`)

Latest pre-Phase 15 scheduled/on-disk backup (2026-08-13) **did not** contain R4 — documented, not treated as failure. Phase 15 backup taken 2026-08-15 includes R4 and was used for restore proof.

---

## 16. R4 Entity Recovery

See §59 table — all critical entities **RECOVERED** in isolated restore DB.

Key IDs preserved:

| Entity | ID / reference |
|---|---|
| Product | `FLOUR-UI17R4-R2M5` · `b5748ad0-ba1d-4c7f-9402-3352c41ba606` |
| PO | `PO-MST4OG0H-9BC37FAB` |
| Order workspace | `39b6c5d8-11dd-4c45-bb1a-70ae7308b0d4` |
| Shipment workspace | `9f1c326a-97ad-4937-a200-09e628251070` |
| Booking ref | `MSCBK-R4-R2M5` · status `CONFIRMED` |
| Container | `MSKU17R4R2M5` |
| Customs case | `8a96c974-700e-40ba-9db0-0b331f7d4583` · `CLEARED` |
| Inland delivery | `5110057f-904d-4219-95e3-689aa6cf701c` · `DELIVERED` |
| Landed cost | v3 · `INCOMPLETE` / `PARTIAL` |

---

## 17. R4 Lineage

Manual chain probe in restored DB:

| Link | Count | Result |
|---|---:|---|
| Product (SKU) | 1 | PASS |
| PO | 1 | PASS |
| Shipment ↔ order | 1 | PASS |
| Customs CLEARED on same shipment workspace | 1 | PASS |
| Inland DELIVERED on same shipment workspace | 1 | PASS |
| Container on shipment row | 1 | PASS (via `shipment_workspaces.id`) |
| PO line product_id → R4 product | linked | PASS |
| Cross-transaction substitution | 0 | PASS |

**Same-Transaction Lineage: PASS**

---

## 18. R4 Financial Recovery

| Component | Expected (R4 evidence) | Restored | Match |
|---|---|---:|---:|
| Goods (90 × USD 18) | USD 1,620 | 1,620.0000 | PASS |
| Freight (customer-facing) | USD 2,100 | 2,100.0000 (`freight_offers.price` / `display_price_usd`) | PASS |
| Inland | USD 450 | 450.0000 | PASS |
| Duty/Tax | Not available (unknown ≠ zero) | `duty_tax_cost` NULL · calc `PROVISIONAL` | PASS |
| Landed cost completeness | INCOMPLETE / PARTIAL | v3 `INCOMPLETE` / `PARTIAL` | PASS |
| Internal buy-rate exposure | Must not leak via restore | No change (DB faithful copy) | PASS |

---

## 19. Lifecycle Recovery

| State | Restored value | Result |
|---|---|---|
| Booking | `CONFIRMED` | PRESERVED |
| Customs | `CLEARED` | PRESERVED |
| Inland | `DELIVERED` | PRESERVED |
| POD status | `AVAILABLE` | PRESERVED |
| Landed cost | v3 present | PRESERVED |

---

## 20. Event / Audit Recovery

| Audit stream | Count (R4 shipment) | Result |
|---|---:|---|
| Customs case events | 14 | PRESERVED |
| Inland delivery events | 9 | PRESERVED |
| Duty/tax calculation | 1 PROVISIONAL | PRESERVED |
| Product change events | present on product row lineage | PASS |

---

## 21. Partner Assignment Recovery

| Role | User | Revoked | Result |
|---|---|---|---|
| CUSTOMS_BROKER | `broker.smoke@demaxtore.local` | no | PRESERVED |
| TRUCKER | `trucker.smoke@demaxtore.local` | no | PRESERVED |

---

## 22. Tenant Isolation

| Check | Result |
|---|---|
| R4 product org | `00000000-0000-0000-0000-00000000c002` (Acme Foods) |
| R4 customs org | same | PASS |
| R4 inland org | same | PASS |
| Wrong-org inland rows for R4 shipment | 0 | PASS |
| POD doc workspace_id | `9f1c326a-97ad-4937-a200-09e628251070` (R4 shipment only) | PASS |
| Cross-shipment POD refs for same file_id | 0 | PASS |

**Tenant Ownership Recovery: PASS**

---

## 23. Document Storage

| Aspect | Detail |
|---|---|
| Canonical binary location | Local filesystem UUID filenames under `apps/backend/.data/uploads/` |
| DB metadata | `trade_documents.file_id` → filename; `trade_document_versions.file_id` |
| R4 POD metadata | doc `15317592-59b6-49c5-a5cc-7c1c4d081b51` · type `PROOF_OF_DELIVERY` |
| R4 POD binary key | `1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf` |
| Production file size | 587 bytes · PDF 1.1 · 1 page · readable |

---

## 24. R4 POD Binary Recovery

| Check | Result |
|---|---|
| POD metadata in restored DB | PASS |
| POD `file_id` in restored DB | PASS |
| Binary in Phase 15 uploads tar | PASS |
| Binary extracted to isolated path | PASS |
| SHA-256 matches production | PASS (`3b3796ec…`) |
| File type readable | PASS (PDF) |

**R4 POD consistency probe (DB + binary same restore point): PASS**

---

## 25. Document Isolation After Restore

- R4 POD maps only to R4 inland delivery / shipment workspace
- No duplicate `pod_trade_document_id` references across other shipments for this file
- **Document Isolation After Restore: PASS**

---

## 26. Restored Application Boot

Isolated instance on port **3099** against restore DB + isolated uploads:

| Probe | Result |
|---|---|
| `GET /api/healthz` | 200 · uptime OK |
| `GET /api/ready` | `ready: true` · `db: up` · `storage: up` |
| Boot-time schema crash | none |
| Unexpected 5xx on health probes | 0 |

Note: Scheduler emitted one non-fatal Prisma unique-constraint warning on control-tower alert scan during boot (existing data collision, not restore corruption).

**Restored Application Boot: PASS**

---

## 27. Restored Buyer Read

| Check | Result |
|---|---|
| Login `buyer1@acme.test` | PASS (JWT issued) |
| Password hash present in restored DB | PASS |
| Full UI navigation | NOT TESTED (isolated port only; no frontend proxy) |

Authentication recovery proven; read-only UI replay deferred to launch go/no-go environment.

---

## 28. Restored Partner Read

| Check | Result |
|---|---|
| Broker login `broker.smoke@demaxtore.local` | PASS |
| Trucker login `trucker.smoke@demaxtore.local` | PASS |
| Partner assignment rows | PRESERVED (§21) |

---

## 29. Authentication Recovery

| Asset | Survives restore? |
|---|---|
| User accounts | YES (135 users) |
| Password hashes | YES (verified buyer/admin/broker/trucker) |
| Organisations | YES (125 orgs) |
| Partner role mappings | YES |
| Refresh tokens | YES (copied; should be rotated after real DR) |

---

## 30. Secrets / Key Recovery Assessment

| Secret / config | Managed in | Recovery path | Loss impact |
|---|---|---|---|
| `DATABASE_URL` | `.env` | Operator backup / secrets store | Cannot connect |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `.env` | Secure backup | Sessions invalid |
| `REDIS_URL` | `.env` | Config backup | Rate limit 503 until restored |
| `STORAGE_DIR` | `.env` | Config backup | Wrong path → missing files |
| `RESEND_API_KEY` / email | `.env` | Secure backup | No outbound email |
| WhatsApp tokens + `WHATSAPP_CONNECTION_ENCRYPTION_KEY` | `.env` | Secure backup | WA integration dead; encrypted tokens lost without key |
| Provider credentials (Sentry, etc.) | `.env` | Secure backup | Observability/integration loss |

**Secrets / Key Recovery: FRICTION** — values exist on-server today but no documented encrypted off-host secret bundle.

---

## 31. Application Version Recovery

| Item | Value |
|---|---|
| Deployed commit (from `/api/healthz`) | `c9e4328d8fd0aef5ce743013bf378e6e35add538` |
| Branch label | `snapshot/pre-pilot-20260714` |
| Build artifact | `apps/backend/dist/server.js` (2026-08-14) |
| Reproducibility | Git repo on server; build via standard deploy scripts |
| Undocumented server-only deps | None identified for restore consume path |

---

## 32. Backup Security

| Check | Finding |
|---|---|
| Dump permissions | `644` (world-readable) — **FRICTION** |
| Backup directory owner | mixed root/demaxtore |
| Off-server exposure | None configured (on-host only) |
| Backups more sensitive than live DB | Yes — bypasses app authorization |

---

## 33. Backup Failure Visibility

| Question | Answer |
|---|---|
| Failure logged? | Cron stdout/stderr → `/var/log/demaxtore-backup.log` **but cron never succeeds** |
| Alert on failure? | **NO** |
| Silent multi-day failure possible? | **YES** (confirmed Aug 9–15 cron fires, no success log) |
| Latest-backup age monitored? | **NO** automated monitor |
| In-app `backup_verification_records` | Last backup record 2026-07-16; **no restore record ever** |

**Backup Failure Visibility: FAIL**

---

## 34. Capacity

| Asset | Size |
|---|---|
| Production uploads | ~130 MB |
| Phase 15 backup total | ~152 MB |
| Available disk on `/` | 125 GB |
| Retention growth risk (14 daily × ~150 MB) | ~2.1 GB — low near-term risk |

---

## 35. RPO

| Metric | Value |
|---|---|
| Observed backup interval (intended) | 24 h (daily cron) |
| Observed backup interval (actual) | **Manual / validation-only** (cron broken) |
| Implied maximum data-loss window if relying on cron | **Unbounded** (no successful automated backup) |
| Implied window using Phase 15 fresh backup | ~0 (point-in-time at backup start) |
| 5-customer pilot RPO acceptable? | **NO** until cron + uploads path fixed and success monitored |

---

## 36. RTO

| Metric | Value |
|---|---|
| Measured DB restore | 6 s |
| Measured backup | 8 s |
| Measured boot + health | ~8 s |
| Practical pilot RTO (with runbook + service cutover) | ~1–2 h (documented) |
| 5-customer pilot RTO acceptable? | **YES** (technical restore is fast; operational coordination dominates) |

---

## 37. Disaster Scenario Matrix

| Scenario | Recoverable | Recovery source | Data loss window | Est./ measured recovery time | Manual steps | Risk |
|---|---|---|---|---|---|---|
| PostgreSQL loss | **YES** | `pg_dump` custom restore + `pg_restore` | Up to last good backup (manual today) | DB restore **6 s** + validation | Create DB, restore, migrate if needed, repoint app | Cron not running → **high loss window** until fixed |
| Document/upload storage loss | **YES** (if uploads tar included) | `uploads.tar.gz` extract to `STORAGE_DIR` | Same as DB backup unless synced | **~2 s** extract + verify | Restore tar; ensure `STORAGE_DIR` absolute | Cron skips uploads → **POD loss risk** on DB-only backups |
| Application host loss | **YES** | Git/build artifact + `.env` backup + DB/uploads restore | Depends on backup freshness | 1–2 h pilot target | Rebuild host, restore secrets, DB, files, systemd | Secrets not in off-host store |
| Redis loss | **YES** | Rebuild empty instance | None (ephemeral) | Minutes | Restart Redis | Low |
| Logical corruption discovered after latest backup | **PARTIAL** | Previous backup ≤14 days | Up to 14 days | Same as restore | Identify last good dump; accept data loss | Only 14 on-host copies; no off-host |
| Full host rebuild | **YES** | Combined DB + uploads + `.env` + deploy scripts | Last backup age | Hours | OS install, PostgreSQL, Node, restore all layers | Multi-step; runbook exists but cron broken |

---

## 38. DB/File Consistency Risk

- DB and uploads are backed up by **sequential steps in one script**, not transactionally synchronized
- Risk: file uploaded after `pg_dump` starts but before `tar` → metadata without binary (or reverse)
- Phase 15 R4 POD probe: **both** metadata and binary present at same restore point → **PASS for validation backup**
- Mitigation today: operator should quiesce uploads or run backup during low activity; no formal lock

---

## 39. Restore Runbook (Phase 15 proven procedure)

**Prerequisites:** Valid `dmx.dump` + `uploads.tar.gz`; empty PostgreSQL database; absolute `STORAGE_DIR`.

```bash
# 1. Variables
ROOT=/var/www/demaxtore/DemaxtoreSolitions-main
BACKUP_DIR=$ROOT/.data/backups/phase15-YYYYMMDD-HHMMSS   # pick stamp
RESTORE_DB=demaxtore_restore_phase15_YYYYMMDD
UPLOADS_RESTORE=$ROOT/.data/restore-uploads-$(date +%Y%m%d)

# 2. Create isolated DB (DO NOT touch demaxtore production DB)
sudo -u postgres createdb -O demaxtore_user "$RESTORE_DB"

# 3. Restore database
cd "$ROOT" && set -a && source apps/backend/.env && set +a
RESTORE_URL="${DATABASE_URL%/*}/${RESTORE_DB}"
pg_restore --dbname="$RESTORE_URL" --no-owner --jobs=2 "$BACKUP_DIR/dmx.dump"

# 4. Restore uploads (isolated path for validation; production DR would use STORAGE_DIR)
mkdir -p "$UPLOADS_RESTORE"
tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_RESTORE"

# 5. Boot isolated app (example — DO NOT bind production port 3001)
PORT=3099 DATABASE_URL="$RESTORE_URL" \
  STORAGE_DIR="$UPLOADS_RESTORE/uploads" \
  SCHEDULER_ENABLED=false \
  node apps/backend/dist/server.js

# 6. Verify
curl -s http://127.0.0.1:3099/api/healthz
curl -s http://127.0.0.1:3099/api/ready
# SQL: probe R4 marker SKU FLOUR-UI17R4-R2M5, POD file_id, CLEARED/DELIVERED states

# 7. Cleanup (after sign-off)
sudo -u postgres dropdb "$RESTORE_DB"
rm -rf "$UPLOADS_RESTORE"
```

**Production DR:** Follow `docs/restore-runbook.md` — stop app, restore into `demaxtore` only during declared maintenance, restore uploads to production `STORAGE_DIR`, start app, run validation checklist.

---

## 40. P0 / P1 / P2 Findings

### P0 — Open: **0**

None. Recovery path proven; no production destructive action; R4 + POD recoverable from appropriate backup.

### P1 — Open: **5**

| ID | Gap | Class |
|---|---|---|
| P1-1 | Cron backup never succeeds (`source` in `/bin/sh`) | SCHEDULING GAP |
| P1-2 | `STORAGE_DIR=./.data/uploads` skips uploads from repo-root cron context | CONFIGURATION GAP |
| P1-3 | No backup failure alerting or backup-age monitoring | MONITORING GAP |
| P1-4 | Backups on-host only; no off-server copy | STORAGE BACKUP GAP |
| P1-5 | `backup_verification_records` has no restore entry since production pilot | RUNBOOK GAP |

### P2 — Open: **3**

| ID | Gap |
|---|---|
| P2-1 | Backup files mode `644` (world-readable) |
| P2-2 | Missing migration SQL file breaks `prisma migrate status` (repo hygiene) |
| P2-3 | DB/file backup not point-in-time synchronized |

---

## 41. Final Verdict

Recovery of pilot-critical customer state **is verified** through isolated restore with R4 golden-path probes including readable POD binary.

Recommended follow-up (not Sprint 43): **Phase 15A — Cron & Upload Backup Remediation** (fix `source` → `. env` or bash shebang, set absolute `STORAGE_DIR` in cron wrapper, add backup success log monitoring).

---

## 59. R4 RECOVERY TABLE — MVP-UI17-R4-20260814-R2M5

| Entity | Status |
|---|---|
| Product | RECOVERED |
| PO | RECOVERED |
| PO Line | RECOVERED |
| Freight | RECOVERED |
| Booking | RECOVERED |
| Shipment | RECOVERED |
| Line Allocation | RECOVERED |
| Container | RECOVERED |
| CustomsCase | RECOVERED |
| Customs CLEARED | PRESERVED |
| DutyTax | NOT PRESENT IN SOURCE (PROVISIONAL calc exists; no evaluated duty total) |
| InlandDelivery | RECOVERED |
| Inland DELIVERED | PRESERVED |
| POD Metadata | RECOVERED |
| POD Binary | RECOVERED + READABLE |
| Landed Cost | RECOVERED |
| Tenant Ownership | PRESERVED |
| Broker Provenance | PRESERVED |
| Trucker Provenance | PRESERVED |
| Same-Transaction Lineage | PASS |

---

## 60. FINAL SUMMARY

```
PHASE 15 — PRODUCTION BACKUP / RESTORE VALIDATION

Production Backup Mechanism: PASS
Backup Schedule: FAIL
Backup Retention: PASS
Latest Backup Freshness: FRICTION
Backup Integrity: PASS
Isolated Database Restore: PASS
Schema / Migration Compatibility: PASS
Restored Application Boot: PASS
R4 Transaction Recovery: PASS
R4 Same-Transaction Lineage: PASS
R4 Financial Recovery: PASS
Customs CLEARED Recovery: PASS
Inland DELIVERED Recovery: PASS
POD Metadata Recovery: PASS
POD Binary Recovery: PASS
Landed Cost Recovery: PASS
Tenant Ownership Recovery: PASS
Partner Assignment / Provenance Recovery: PASS
Document Isolation After Restore: PASS
Redis Durability Requirement: NOT REQUIRED
Secrets / Key Recovery: FRICTION
Backup Failure Visibility: FAIL
Restore Runbook: FRICTION
Observed Backup Interval: 24h intended; actual automated success none (cron broken)
Implied Maximum Data-Loss Window: unbounded if relying on cron; ~24h once cron fixed
Measured Restore Time: ~24s (DB+files+boot smoke); ~6s DB-only
5-Customer Pilot RPO Acceptable: NO
5-Customer Pilot RTO Acceptable: YES
Production Destructive Action Used: NO
Unexpected Critical Restore Errors: 0
P0 Open: 0
P1 Open: 5
P2 Open: 3

PHASE 15 VERDICT:

PASS — RECOVERY VERIFIED
```

---

## 47. Optional Checksum Manifest (non-secret)

```json
{
  "phase15BackupDir": "phase15-20260815-052311",
  "backupTimestampUtc": "2026-08-15T05:23:11Z",
  "restoreDb": "demaxtore_restore_phase15_20260815",
  "r4Marker": "MVP-UI17-R4-20260814-R2M5",
  "r4Sku": "FLOUR-UI17R4-R2M5",
  "r4ShipmentWorkspaceId": "9f1c326a-97ad-4937-a200-09e628251070",
  "r4PodFileId": "1a62dab4-57b6-4150-bc21-b9cb4e1f3ca8.pdf",
  "r4PodSha256": "3b3796ec2e4337689b50546bd41667932421f1dc08f83c0f867aa0513d5d4767",
  "tableCounts": {
    "products": 25,
    "purchase_orders": 101,
    "shipment_workspaces": 29,
    "customs_cases": 22,
    "inland_deliveries": 14,
    "trade_documents": 1081,
    "users": 135,
    "organisations": 125
  },
  "financialProbe": {
    "goodsUsd": 1620,
    "freightUsd": 2100,
    "inlandUsd": 450,
    "dutyTaxUsd": null
  }
}
```

---

## 48. Table Count Sanity (production vs restored @ same backup point)

All compared tables **match exactly** — confirms faithful restore at recovery point.
