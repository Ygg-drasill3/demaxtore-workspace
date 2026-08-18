# Faz 1 — In-Flight Migration Runbook

## Scope

Read-only audit of active ORDER/SHIPMENT workspace pairs for FSM desync. No automatic state migration.

## Prerequisites

- Database migrations applied: `20260617120000_faz1_processed_events`
- `yarn workspace @dmx/backend prisma:deploy`

## Steps

### 1. Staging audit

```bash
cd /var/www/demaxtore/DemaxtoreSolitions-main
node apps/backend/scripts/fsm-migration-audit.mjs > /tmp/fsm-audit-staging.json
```

Review `desyncPairs` with ops. Critical rules:

| Rule | Meaning |
|------|---------|
| `ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT` | Order ahead of shipment |
| `ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED` | Delivery mismatch |
| `ORDER_SHIPMENT_BOOKED_LAG` | Booking not confirmed on shipment |
| `ORDER_ARRIVED_SHIPMENT_IN_TRANSIT` | Arrival mismatch |

### 2. Production audit (read-only)

Same command on production. Do not use `--apply-metadata` until Faz 1 deploy is live.

### 3. Metadata stamp (optional, post-deploy)

```bash
node apps/backend/scripts/fsm-migration-audit.mjs --apply-metadata
```

Sets `workspace.metadata.fsmVersion = 1` on active ORDER/SHIPMENT workspaces.

### 4. Control Tower

After deploy, `ORDER_SHIPMENT_STATE_MISMATCH` alerts appear in Control Tower for ongoing desync.

## Manual remediation

Desync rows are **not** auto-fixed in Faz 1. Ops should:

1. Open unified trade workspace
2. Advance the lagging FSM manually, or
3. Wait for Faz 2 orchestrator (shadow mode) recommendations

## Rollback

- Faz 1 FSM states are additive; no existing states removed
- `processed_events` table can remain; duplicates are safe
- Metadata stamp is idempotent
