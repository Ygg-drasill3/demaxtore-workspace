# Unified Messaging Rollout

## Staging sequence (do not run on production until certified)

### Stage A — Shadow

```bash
UNIFIED_MESSAGING_ENABLED=true
UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=true
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true
UNIFIED_MESSAGING_READ_MODE=shadow
UNIFIED_MESSAGING_WRITE_MODE=legacy_primary_unified_mirror
```

Gates: healthz/ready 200, PM2 online, single port 3001 listener, `messaging-shadow-compare.ts --all`, legacy API smoke, `/messages` smoke, WhatsApp webhook regression.

### Stage B — Unified fallback read

`UNIFIED_MESSAGING_READ_MODE=unified_fallback`  
`UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror`

### Stage C — Unified primary staging

`UNIFIED_MESSAGING_READ_MODE=unified`  
`UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror`

### Production first step (after all gates PASS)

`UNIFIED_MESSAGING_READ_MODE=shadow`  
`UNIFIED_MESSAGING_WRITE_MODE=legacy_primary_unified_mirror`

Never jump directly to `unified_only`.
