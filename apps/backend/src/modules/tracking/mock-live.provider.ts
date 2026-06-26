import type { TrackingProvider } from "./tracking.types.js";
import type { ProviderSnapshot, ProviderTrackingEvent, TrackingContext } from "./tracking.types.js";

/** Live-like deterministic snapshots for staging without vendor API keys. */
export class MockLiveTrackingProvider implements TrackingProvider {
  readonly name = "MOCK_LIVE" as const;

  async syncShipment(ctx: TrackingContext): Promise<ProviderSnapshot> {
    return this.fetchTracking(ctx);
  }

  async fetchTracking(ctx: TrackingContext): Promise<ProviderSnapshot> {
    const now = new Date();
    const gen = ctx.syncGeneration;
    const etd = new Date(now.getTime() - 2 * 86400_000);
    const eta = new Date(now.getTime() + (10 - gen) * 86400_000);
    const statuses = ["BOOKED", "DEPARTED", "IN_TRANSIT", "ARRIVED_PORT"] as const;
    const status = statuses[Math.min(gen, statuses.length - 1)];

    return {
      provider: "MOCK_LIVE",
      vesselName: ctx.vesselName ?? "EVER GOLDEN",
      imo: "9876543",
      mmsi: "538009999",
      carrier: "Evergreen Line",
      voyage: "024E",
      pol: ctx.originPort,
      pod: ctx.destinationPort,
      etd,
      eta,
      lastPositionAt: now,
      trackingStatus: status,
      delayFlag: gen >= 3 ? "MINOR" : "NONE",
      raw: { source: "mock_live", generation: gen },
    };
  }

  async fetchEvents(_ctx: TrackingContext, snap: ProviderSnapshot): Promise<ProviderTrackingEvent[]> {
    return [{
      eventType: "shipment.position.updated",
      title: "Position update",
      description: `${snap.vesselName} en route to ${snap.pod}`,
      occurredAt: new Date(),
    }];
  }
}
