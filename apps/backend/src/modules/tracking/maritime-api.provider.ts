import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ManualTrackingProvider } from "./manual.provider.js";
import type { TrackingProvider, TrackingContext, ProviderSnapshot, ProviderTrackingEvent } from "./tracking.types.js";

const fallback = new ManualTrackingProvider();

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const timeout = env.TRACKING_HTTP_TIMEOUT_MS;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= env.TRACKING_HTTP_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
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
export class MaritimeApiTrackingProvider implements TrackingProvider {
  readonly name = "MARITIME_API" as const;

  async syncShipment(ctx: TrackingContext): Promise<ProviderSnapshot> {
    return this.fetchTracking(ctx);
  }

  async fetchTracking(ctx: TrackingContext): Promise<ProviderSnapshot> {
    if (!env.TRACKING_BASE_URL || !env.TRACKING_API_KEY) {
      logger.info("Maritime API not configured — using manual fallback");
      const snap = await fallback.fetchTracking(ctx);
      return { ...snap, provider: "MARITIME_API" };
    }

    const q = new URLSearchParams();
    if (ctx.containerNumber) q.set("container", ctx.containerNumber);
    if (ctx.bookingNumber) q.set("booking", ctx.bookingNumber);
    if (ctx.vesselName) q.set("vessel", ctx.vesselName);

    const url = `${env.TRACKING_BASE_URL.replace(/\/$/, "")}/v1/track?${q}`;

    try {
      const res = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${env.TRACKING_API_KEY}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as Record<string, unknown>;
      return mapApiBody(body, ctx);
    } catch (e) {
      logger.error({ err: e, shipmentId: ctx.shipmentId }, "Maritime API fetch failed — manual fallback");
      const snap = await fallback.fetchTracking(ctx);
      return { ...snap, provider: "MARITIME_API", raw: { fallback: true, error: String(e) } };
    }
  }

  async fetchEvents(ctx: TrackingContext, snap: ProviderSnapshot): Promise<ProviderTrackingEvent[]> {
    return fallback.fetchEvents(ctx, snap);
  }
}

function mapApiBody(body: Record<string, unknown>, ctx: TrackingContext): ProviderSnapshot {
  const now = new Date();
  return {
    provider: "MARITIME_API",
    vesselName: (body.vesselName as string) ?? ctx.vesselName,
    imo: (body.imo as string) ?? null,
    mmsi: (body.mmsi as string) ?? null,
    carrier: (body.carrier as string) ?? null,
    voyage: (body.voyage as string) ?? null,
    pol: (body.pol as string) ?? ctx.originPort,
    pod: (body.pod as string) ?? ctx.destinationPort,
    etd: body.etd ? new Date(body.etd as string) : new Date(now.getTime() + 86400_000),
    eta: body.eta ? new Date(body.eta as string) : new Date(now.getTime() + 10 * 86400_000),
    lastPositionAt: body.lastPositionAt ? new Date(body.lastPositionAt as string) : now,
    trackingStatus: (body.status as ProviderSnapshot["trackingStatus"]) ?? "IN_TRANSIT",
    delayFlag: (body.delayFlag as ProviderSnapshot["delayFlag"]) ?? "NONE",
    raw: body,
  };
}
