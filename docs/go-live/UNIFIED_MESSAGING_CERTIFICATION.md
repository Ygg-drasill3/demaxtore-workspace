# Unified Messaging Certification — PROD D

**Date:** 2026-07-17  
**Status:** PROD D (`unified_only`) active

## Production flags (final)

```
UNIFIED_MESSAGING_ENABLED=true
UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=true
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=false
UNIFIED_MESSAGING_READ_MODE=unified
UNIFIED_MESSAGING_WRITE_MODE=unified_only
```

## Evidence

| Gate | Result |
|------|--------|
| Backend tests | 274/274 PASS |
| WhatsApp + unified module | 53/53 PASS |
| Shadow compare (production) | 0 mismatches |
| Staging A/B/C/D | PASS |
| Backfill idempotent | PASS |
| healthz / ready | 200 |
| PM2 demaxtore-backend | online, port 3001 |
| Transactional outbox | `messaging_outbox_events` + worker |
| Persistent dedup | Redis SET NX + `messaging_idempotency_keys` |
| Staging anonymization | Applied on `demaxtore_unified_staging` |

## Rollback

Set `UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror`, `UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true`, then `pm2 restart demaxtore-backend --update-env`.
