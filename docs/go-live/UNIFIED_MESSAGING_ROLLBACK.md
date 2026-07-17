# Unified Messaging Rollback

## Immediate rollback

```bash
# Restore legacy-only flags
export UNIFIED_MESSAGING_ENABLED=false
export UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED=false
export UNIFIED_MESSAGING_SHADOW_READ_ENABLED=false
export UNIFIED_MESSAGING_READ_MODE=legacy
export UNIFIED_MESSAGING_WRITE_MODE=legacy_only

bash scripts/pm2-safe-backend-restart.sh
```

Verify: `curl -sf http://127.0.0.1:3001/api/healthz` and `curl -sf http://127.0.0.1:3001/api/ready`.

## Data

Unified tables are additive. Rollback does not delete `workspace_conversations` / `workspace_messages`. Legacy paths remain source of truth while `WRITE_MODE=legacy_only`.

## Git rollback

```bash
git revert <cutover-commit-hash>
yarn workspace @dmx/backend build
bash scripts/pm2-safe-backend-restart.sh
```
