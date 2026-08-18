# Sprint 4B — Maritime Tracking Report

## Summary

Sprint 4B adds **port-to-port maritime visibility** to Shipment Workspaces via an external tracking provider abstraction. No FSM or workflow changes.

## Delivered

| Phase | Item | Status |
|-------|------|--------|
| 1 | `packages/contracts/src/shipment-tracking.ts` | ✓ |
| 2 | `shipment_tracking_snapshots`, `shipment_tracking_events`, shipment link fields | ✓ |
| 3–4 | `apps/backend/src/modules/tracking/*` (Manual + Maritime API providers) | ✓ |
| 5 | `POST /api/shipments/:id/link-tracking` | ✓ |
| 6 | 60-minute tracking scheduler | ✓ |
| 7 | Timeline + tracking events (informational) | ✓ |
| 8 | Control Tower ETA/drift/delay alerts | ✓ |
| 9 | Shipment workspace tracking panels | ✓ |
| 10 | `/operations` shipment tracking section | ✓ |
| 11 | Socket: `shipment.tracking.updated/delay/arrived` | ✓ |
| 12 | `09-maritime-tracking.spec.ts` + unit tests | ✓ |

## API

- `GET /api/shipments/:id/tracking`
- `GET /api/shipments/:id/tracking/events`
- `POST /api/shipments/:id/link-tracking`
- `POST /api/shipments/:id/sync-tracking`
- `GET /api/control-tower/shipment-tracking` (ADMIN ops lists)

## Environment

```env
TRACKING_PROVIDER=manual          # manual | maritime_api
TRACKING_API_KEY=
TRACKING_BASE_URL=
TRACKING_SYNC_INTERVAL_MS=3600000
```

## Out of scope (honoured)

FreightIQ, IoT/GPS hardware, maps/AIS, carrier marketplace, route optimization, trucking/last-mile.
