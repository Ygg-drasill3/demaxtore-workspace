/** Live-like deterministic snapshots for staging without vendor API keys. */
export class MockLiveTrackingProvider {
    name = "MOCK_LIVE";
    async syncShipment(ctx) {
        return this.fetchTracking(ctx);
    }
    async fetchTracking(ctx) {
        const now = new Date();
        const gen = ctx.syncGeneration;
        const etd = new Date(now.getTime() - 2 * 86400_000);
        const eta = new Date(now.getTime() + (10 - gen) * 86400_000);
        const statuses = ["BOOKED", "DEPARTED", "IN_TRANSIT", "ARRIVED_PORT"];
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
    async fetchEvents(_ctx, snap) {
        return [{
                eventType: "shipment.position.updated",
                title: "Position update",
                description: `${snap.vesselName} en route to ${snap.pod}`,
                occurredAt: new Date(),
            }];
    }
}
//# sourceMappingURL=mock-live.provider.js.map