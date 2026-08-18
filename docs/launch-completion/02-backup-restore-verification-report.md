# Backup Restore Verification Report

**Date:** 2026-06-17  
**Environment:** Staging  
**Tool:** [`tools/hardening/backup-restore-drill.sh`](../../tools/hardening/backup-restore-drill.sh)

---

## Verdict: **PARTIAL — dump verified, full restore not completed**

---

## Source database counts (pre-backup)

| Entity | Count |
|--------|------:|
| Orders | 126 |
| Shipments | 51 |
| Payment plans | 0 |
| Trade exceptions | 175 |

---

## Backup execution

| Metric | Value |
|--------|-------|
| Output | `.data/drills/20260617-131719/dmx.dump` |
| Duration | 1 second |
| TOC entries (`pg_restore --list`) | 682 |
| Uploads archive | Not present (no `STORAGE_DIR` data dir) |

**Dump integrity:** **PASS** — `pg_restore --list` succeeded; dump contains full schema + data objects.

---

## Restore drill

| Step | Result |
|------|--------|
| Create isolated DB `demaxtore_restore_drill` | **FAIL** — `permission denied to create database` (app user lacks `CREATEDB`) |
| `pg_restore` to isolated DB | **SKIPPED** |
| Post-restore count comparison | **SKIPPED** |

---

## Ops action required

1. Run restore drill as PostgreSQL superuser or grant `CREATEDB` to ops role on staging
2. Re-run restore and compare the four entity counts above
3. Schedule `scripts/backup-cron.example.sh` (see P0 report — not yet in crontab)
4. Record backup via System Operations / backup verification API after first scheduled run

---

## Rollback reference

See [`docs/backup-runbook.md`](../backup-runbook.md) and [`docs/restore-runbook.md`](../restore-runbook.md).
