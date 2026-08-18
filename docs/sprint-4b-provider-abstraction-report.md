# Sprint 4B — Provider Abstraction Report

## Interface (`tracking.types.ts`)

```typescript
interface TrackingProvider {
  name: TrackingProviderType;
  syncShipment(ctx): Promise<ProviderSnapshot>;
  fetchTracking(ctx): Promise<ProviderSnapshot>;
  fetchEvents(ctx, snapshot): Promise<ProviderTrackingEvent[]>;
}
```

Factory: `resolveTrackingProvider()` reads `TRACKING_PROVIDER` env.

## Implementations

### ManualTrackingProvider

- Deterministic snapshots from container/booking/vessel seed
- Progresses status by sync generation (BOOKED → DEPARTED → IN_TRANSIT → ARRIVED_PORT)
- Used for dev, E2E, and Maritime API fallback

### MaritimeApiTrackingProvider

- HTTP `GET {TRACKING_BASE_URL}/v1/track?container=…&booking=…&vessel=…`
- Bearer `TRACKING_API_KEY`
- Retry + timeout via `TRACKING_HTTP_RETRIES` / `TRACKING_HTTP_TIMEOUT_MS`
- On failure: logs error, returns manual-shaped snapshot (no shipment state mutation)

## Rules

- All external HTTP confined to `maritime-api.provider.ts`
- `TrackingService` owns persistence, diff, timeline, Control Tower hooks, sockets
- Snapshots are append-only; events are append-only

## Diff engine (`tracking.diff.ts`)

- ETA shift hours between snapshots
- Alerts: ≥24h WARNING, ≥72h CRITICAL
- Delay flag → `tracking_delay_detected`
- Arrival → auto-resolve tracking Control Tower alerts
