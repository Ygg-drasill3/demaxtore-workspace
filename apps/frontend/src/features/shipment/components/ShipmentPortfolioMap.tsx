import { useMemo } from "react";
import type { ShipmentPortfolioMapPoint } from "@dmx/contracts/shipment-portfolio";
import { cn } from "@/lib/utils";
import { interpolateLngLat, positionOnSeaRoute, resolvePortLngLat } from "../lib/port-coords";
import { LiveShipmentMap, type LiveMapMarker } from "./LiveShipmentMap";

const STATUS_COLORS: Record<string, string> = {
  "On Track": "text-emerald-600",
  "At Risk": "text-amber-600",
  Delayed: "text-red-600",
  Delivered: "text-zinc-500",
  Cancelled: "text-zinc-400",
};

interface Props {
  points: ShipmentPortfolioMapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function ShipmentPortfolioMap({ points, selectedId, onSelect }: Props) {
  const markers = useMemo(() => {
    const out: LiveMapMarker[] = [];
    for (const p of points.slice(0, 8)) {
      const o = resolvePortLngLat(p.origin);
      const d = resolvePortLngLat(p.destination);
      if (!o || !d) continue;
      const t = Math.min(1, Math.max(0.05, p.progressPercent / 100));
      const cur = positionOnSeaRoute(p.origin, p.destination, t) ?? interpolateLngLat(o, d, t);
      out.push(
        { id: `${p.shipmentId}-o`, label: p.origin, lng: o[0], lat: o[1], kind: "origin" },
        { id: `${p.shipmentId}-d`, label: p.destination, lng: d[0], lat: d[1], kind: "destination" },
        {
          id: p.shipmentId,
          label: p.shipmentNumber.slice(-8),
          lng: cur[0],
          lat: cur[1],
          kind: "vessel",
          progressPercent: p.progressPercent,
        },
      );
    }
    return out;
  }, [points]);

  if (points.length === 0) {
    return (
      <div data-testid="shipment-portfolio-map-empty" className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
        No shipment routes to display. Routes appear when shipments are in transit.
      </div>
    );
  }

  return (
    <div data-testid="shipment-portfolio-map" className="space-y-4">
      <LiveShipmentMap
        testId="shipment-portfolio-live-map"
        eyebrow="Live map"
        title="Active shipment positions"
        markers={markers.length > 0 ? markers : undefined}
        heightClassName="h-64 sm:h-80"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {points.map((p) => (
          <button
            key={p.shipmentId}
            type="button"
            data-testid={`map-card-${p.shipmentId}`}
            onClick={() => onSelect?.(p.shipmentId)}
            className={cn(
              "text-left rounded-lg border p-3 text-sm transition-colors",
              selectedId === p.shipmentId ? "border-accent-900 bg-accent-50/30" : "border-zinc-100 hover:bg-zinc-50",
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="font-mono text-xs">{p.shipmentNumber}</span>
              <span className={cn("text-xs font-medium", STATUS_COLORS[p.status])}>{p.status}</span>
            </div>
            <div className="mt-1 text-xs text-zinc-600">{p.routeLabel}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                <span className="block h-full bg-accent-900 rounded-full" style={{ width: `${p.progressPercent}%` }} />
              </span>
              <span>{p.progressPercent}%</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {p.hasLivePosition ? "Live tracking" : "Milestone route"} · {p.currentPosition}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
