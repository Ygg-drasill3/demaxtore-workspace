# Restore Drill Report

**Date:** 2026-06-17 (original) · **Retest reference:** 2026-07-16  
**Environment:** Staging  
**Verdict:** **VERIFIED** (historical drill — not re-executed during 2026-07-16 enterprise remediation to avoid production DB disruption)

> **Enterprise deployment note (2026-07-16):** Pre-deploy backup created at `.data/backups/20260716-091714/` (4.6 MB custom-format dump). No new restore drill executed.

---

## Procedure executed

1. Source counts from `demaxtore` database
2. `tools/hardening/backup-restore-drill.sh` → `pg_dump`
3. `sudo -u postgres` created isolated DB `demaxtore_restore_drill`
4. `pg_restore --clean --if-exists --no-owner` into restore DB
5. Post-restore count comparison + FK constraint count

---

## Source vs restore counts

| Entity | Source | Restore | Match |
|--------|-------:|--------:|:-----:|
| Orders | 126 | 126 | Yes |
| Shipments | 51 | 51 | Yes |
| Payment plans | 0 | 0 | Yes |
| Trade exceptions | 175 | 175 | Yes |

---

## Performance

| Metric | Value |
|--------|-------|
| Dump duration | ~1s |
| Restore duration | **2s** |
| Dump path | `.data/drills/20260617-132554/dmx.dump` |
| TOC entries | 682 (prior verification) |

---

## Schema integrity

| Check | Result |
|-------|--------|
| `pg_restore` exit | Success (warnings only on clean) |
| Foreign key constraints | **124** present post-restore |
| Application connect | Restore DB reachable via `DATABASE_URL` path swap |

---

## Cleanup

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS demaxtore_restore_drill;"
```

Run after drill sign-off (optional — keep for regression testing).

---

## Prior blocker resolved

Launch Completion reported `permission denied to create database` for app user. **Resolved** using `postgres` superuser for drill DB creation.

---

## Quarterly schedule

Repeat drill every 90 days or after major schema migration. Document in ops calendar.
