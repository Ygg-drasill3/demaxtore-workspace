import type { TrackingProvider } from "./tracking.types.js";
import type { ProviderSnapshot, ProviderTrackingEvent, TrackingContext } from "./tracking.types.js";

/** Deterministic maritime-style snapshot for dev/E2E without external API. */
export class ManualTrackingProvider implements TrackingProvider {
  readonly name = "MANUAL" as const;

  async syncShipment(ctx: TrackingContext): Promise<ProviderSnapshot> {
    return this.fetchTracking(ctx);
  }

  async fetchTracking(ctx: TrackingContext): Promise<ProviderSnapshot> {
    const seed = hash(ctx.containerNumber ?? ctx.bookingNumber ?? ctx.vesselName ?? ctx.shipmentId);
    const now = new Date();
    const gen = ctx.syncGeneration;
    const statuses = ["BOOKED", "DEPARTED", "IN_TRANSIT", "IN_TRANSIT", "ARRIVED_PORT", "COMPLETED"] as const;
    const idx = Math.min(gen, statuses.length - 1);
    const status = statuses[idx];
    const etd = new Date(now.getTime() + 2 * 86400_000);
    const eta = new Date(now.getTime() + (14 + gen) * 86400_000);
    const delayFlag = gen >= 2 && (status === "IN_TRANSIT" || status === "DEPARTED") ? "MINOR" as const : "NONE" as const;

    return {
      provider: "MANUAL",
      vesselName: ctx.vesselName ?? `MV DMX-${seed.slice(0, 6)}`,
      imo: `IMO${seed.slice(0, 7)}`,
      mmsi: `MMSI${seed.slice(2, 9)}`,
      carrier: "Maersk Line (manual)",
      voyage: `V${1000 + (seed.charCodeAt(0) % 900)}`,
      pol: ctx.originPort,
      pod: ctx.destinationPort,
      etd,
      eta,
      lastPositionAt: now,
      trackingStatus: status,
      delayFlag,
      raw: { source: "manual", generation: gen },
    };
  }

  async fetchEvents(ctx: TrackingContext, snap: ProviderSnapshot): Promise<ProviderTrackingEvent[]> {
    const now = new Date();
    const events: ProviderTrackingEvent[] = [];
    if (snap.trackingStatus === "DEPARTED" || snap.trackingStatus === "IN_TRANSIT") {
      events.push({
        eventType: "shipment.vessel.departed",
        title: "Vessel departed",
        description: `${snap.vesselName} departed ${snap.pol}`,
        occurredAt: new Date(now.getTime() - 3600_000),
      });
    }
    if (snap.delayFlag !== "NONE") {
      events.push({
        eventType: "shipment.delay.detected",
        title: "Delay detected",
        description: `Maritime tracking reports ${snap.delayFlag.toLowerCase()} delay`,
        occurredAt: now,
      });
    }
    if (snap.trackingStatus === "ARRIVED_PORT" || snap.trackingStatus === "COMPLETED") {
      events.push({
        eventType: "shipment.arrived.port",
        title: "Arrived destination port",
        description: `${snap.vesselName} arrived at ${snap.pod}`,
        occurredAt: now,
      });
    }
    if (ctx.syncGeneration > 0) {
      events.push({
        eventType: "shipment.eta.updated",
        title: "ETA updated",
        description: `ETA now ${snap.eta.toISOString()}`,
        occurredAt: now,
        rawPayload: { eta: snap.eta.toISOString() },
      });
    }
    return events;
  }
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}
