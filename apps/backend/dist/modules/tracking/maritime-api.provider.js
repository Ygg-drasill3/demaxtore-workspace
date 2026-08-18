import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ManualTrackingProvider } from "./manual.provider.js";
const fallback = new ManualTrackingProvider();
async function fetchWithRetry(url, init) {
    const timeout = env.TRACKING_HTTP_TIMEOUT_MS;
    let lastErr;
    for (let attempt = 0; attempt <= env.TRACKING_HTTP_RETRIES; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
            const res = await fetch(url, { ...init, signal: ctrl.signal });
            clearTimeout(timer);
            return res;
        }
        catch (e) {
            clearTimeout(timer);
            lastErr = e;
            logger.warn({ url, attempt, err: e }, "Maritime API request failed");
            if (attempt < env.TRACKING_HTTP_RETRIES) {
                await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
        }
    }
    throw lastErr;
}
/** Maritime API adapter — HTTP only in this layer; falls back to manual on failure. */
export class MaritimeApiTrackingProvider {
    name = "MARITIME_API";
    async syncShipment(ctx) {
        return this.fetchTracking(ctx);
    }
    async fetchTracking(ctx) {
        if (!env.TRACKING_BASE_URL || !env.TRACKING_API_KEY) {
            logger.info("Maritime API not configured — using manual fallback");
            const snap = await fallback.fetchTracking(ctx);
            return { ...snap, provider: "MARITIME_API" };
        }
        const q = new URLSearchParams();
        if (ctx.containerNumber)
            q.set("container", ctx.containerNumber);
        if (ctx.bookingNumber)
            q.set("booking", ctx.bookingNumber);
        if (ctx.vesselName)
            q.set("vessel", ctx.vesselName);
        const url = `${env.TRACKING_BASE_URL.replace(/\/$/, "")}/v1/track?${q}`;
        try {
            const res = await fetchWithRetry(url, {
                headers: {
                    Authorization: `Bearer ${env.TRACKING_API_KEY}`,
                    Accept: "application/json",
                },
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const body = await res.json();
            return mapApiBody(body, ctx);
        }
        catch (e) {
            logger.error({ err: e, shipmentId: ctx.shipmentId }, "Maritime API fetch failed — manual fallback");
            const snap = await fallback.fetchTracking(ctx);
            return { ...snap, provider: "MARITIME_API", raw: { fallback: true, error: String(e) } };
        }
    }
    async fetchEvents(ctx, snap) {
        return fallback.fetchEvents(ctx, snap);
    }
}
function mapApiBody(body, ctx) {
    const now = new Date();
    return {
        provider: "MARITIME_API",
        vesselName: body.vesselName ?? ctx.vesselName,
        imo: body.imo ?? null,
        mmsi: body.mmsi ?? null,
        carrier: body.carrier ?? null,
        voyage: body.voyage ?? null,
        pol: body.pol ?? ctx.originPort,
        pod: body.pod ?? ctx.destinationPort,
        etd: body.etd ? new Date(body.etd) : new Date(now.getTime() + 86400_000),
        eta: body.eta ? new Date(body.eta) : new Date(now.getTime() + 10 * 86400_000),
        lastPositionAt: body.lastPositionAt ? new Date(body.lastPositionAt) : now,
        trackingStatus: body.status ?? "IN_TRANSIT",
        delayFlag: body.delayFlag ?? "NONE",
        raw: body,
    };
}
//# sourceMappingURL=maritime-api.provider.js.map