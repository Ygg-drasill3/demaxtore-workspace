# Unified Messaging Staging Certification

**Date:** 2026-07-17

## Environment

| Item | Value |
|------|-------|
| Database | `demaxtore_unified_staging` |
| Port | 3101 |
| PM2 process | `demaxtore-backend-unified-staging` |
| Production port | 3001 (unchanged) |

## Stage results

| Stage | READ_MODE | WRITE_MODE | Shadow mismatches | healthz/ready |
|-------|-----------|------------|-------------------|---------------|
| A | shadow | legacy_primary_unified_mirror | 0 | 200 |
| B | unified_fallback | unified_primary_legacy_mirror | 0 | 200 |
| C | unified | unified_primary_legacy_mirror | 0 | 200 |
| D | unified | unified_only | 0 | 200 |

## Script

`scripts/unified-messaging-staging-gates.sh` with `SKIP_MIGRATE=1` when DB is cloned from production.
