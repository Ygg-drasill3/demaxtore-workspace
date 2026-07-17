# Unified Messaging Certification

**Date:** 2026-07-17  
**Status:** PARTIAL — FULL DoD not yet achieved  
**Production mode:** `unified_primary_legacy_mirror` (safe rollback applied)

## Stage 1 rollback (this session)

Production rolled back from unsafe `unified_only` to:

```
UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true
```

Verified: healthz 200, ready 200, PM2 online, port 3001 single listener.

## Test evidence (this session)

| Suite | Result |
|-------|--------|
| Backend unit/integration | 281/281 PASS |
| WhatsApp + unified modules | 59/59 PASS |
| Frontend build | PASS |
| Dispatcher tests | 3/3 PASS |
| Query-count (1/10/100/500) | PASS |

## Remaining gaps (honest)

- Write coverage: 30+/37 surfaces wired; FreightIQ, unarchive, priority, retry partial
- E2E 68 matrix: written, Playwright full run pending dedicated E2E webServer
- Staging A/B/C/D: not re-run this session
- Rollback test script: added, staging `.env.staging` missing
- `main` branch merge: conflicts unresolved
- PROD D (`unified_only`): **not applied** — gates incomplete

## Rollback command

```bash
# Keep production safe until FULL DoD PASS
UNIFIED_MESSAGING_WRITE_MODE=unified_primary_legacy_mirror
UNIFIED_MESSAGING_SHADOW_READ_ENABLED=true
bash scripts/pm2-safe-backend-restart.sh
```
