# Mixed Container Control Tower Report — Sprint 12C

**Date:** 2026-06-08  
**Scope:** Additive Control Tower alerts for Mixed Container procurement

## Alert Keys

| Key | Trigger | Severity |
|-----|---------|----------|
| `mixed_container_pricing_pending` | State `MC_PRICING_REQUESTED` | WARNING |
| `mixed_container_offer_expiring` | Sent offer expires within 24h | WARNING |
| `mixed_container_revision_pending` | State `MC_REVISION_REQUESTED` | INFO |
| `mixed_container_offer_approved` | State `MC_APPROVED` (recent) | INFO |

## Integration

- Scanner: `apps/backend/src/modules/mixed-container/mixed-container-alerts.ts`
- Registered in `alert-engine.ts` `runFullScan()`
- Category: `MIXED_CONTAINER`
- Workspace type: `MIXED_CONTAINER`

## Deduplication

Uses existing `upsertControlTowerAlert()` — one open alert per `(workspaceId, alertKey)`.

## Contracts

Extended `AlertCategory` and `ControlTowerWorkspaceType` with `MIXED_CONTAINER`.

Extended `AlertKey` enum in `@dmx/contracts/control-tower`.

## Verification

Playwright test 08 runs Control Tower scan and asserts mixed-container alerts exist for the test workspace.

## Status

**PASS** — Four additive alert types integrated into Control Tower scan.
