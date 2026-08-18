# Backup Operations Runbook

**Owner:** Ops  
**Last updated:** 2026-06-17

---

## Components

| Asset | Script | Location |
|-------|--------|----------|
| PostgreSQL | `pg_dump --format=custom --no-owner` | `scripts/backup-cron.example.sh` |
| Uploads | `tar -czf uploads.tar.gz` | Same script, if `STORAGE_DIR` exists |
| Install cron | `scripts/install-backup-cron.sh` | Idempotent |

---

## Schedule

```cron
0 2 * * * cd /var/www/demaxtore/DemaxtoreSolitions-main && set -a && source apps/backend/.env && set +a && ./scripts/backup-cron.example.sh >> /var/log/demaxtore-backup.log 2>&1 # demaxtore-backup-cron
```

**Status (staging):** Installed 2026-06-17.

---

## Naming convention

```
.data/backups/YYYYMMDD-HHMMSS/
  dmx.dump          # PostgreSQL custom format
  uploads.tar.gz    # optional
```

---

## Retention policy

- **14 days** — `find ... -mtime +14 -exec rm -rf`
- Disk check: 71G free on `/dev/sda1` (2026-06-17); ~6MB current `.data` usage
- Estimate: ~50–200MB per dump at current scale; 14 days ≈ &lt;3GB

---

## Restore compatibility

- Format: PostgreSQL custom (`pg_restore` required)
- `--no-owner` on dump — restore as superuser or matching role
- Compatible with [`tools/hardening/backup-restore-drill.sh`](../../tools/hardening/backup-restore-drill.sh)

---

## Verification

1. Check log: `/var/log/demaxtore-backup.log`
2. List: `ls -la .data/backups/`
3. Admin API: `GET /api/system/backup-status` (record manual runs until cron proven)
4. Quarterly: full restore drill — [`restore-drill-report.md`](restore-drill-report.md)

---

## Rollback

Disable cron: `crontab -e` — remove line with `# demaxtore-backup-cron`.

---

## Related

- [`docs/backup-runbook.md`](../backup-runbook.md)
- [`docs/restore-runbook.md`](../restore-runbook.md)
