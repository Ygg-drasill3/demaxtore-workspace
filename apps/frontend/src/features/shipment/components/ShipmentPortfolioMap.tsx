import type { ShipmentPortfolioMapPoint } from "@dmx/contracts/shipment-portfolio";
import { cn } from "@/lib/utils";

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
  if (points.length === 0) {
    return (
      <div data-testid="shipment-portfolio-map-empty" className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
        No shipment routes to display. Routes appear when shipments are in transit.
      </div>
    );
  }

  return (
    <div data-testid="shipment-portfolio-map" className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 overflow-x-auto">
        <svg viewBox="0 0 800 200" className="w-full min-w-[640px] h-48" role="img" aria-label="Shipment route map">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <path d="M 60 100 Q 200 40, 400 100 T 740 100" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="8 6" />
          {points.slice(0, 6).map((p, i) => {
            const x = 60 + (680 * p.progressPercent) / 100;
            const y = 100 + Math.sin(i * 1.2) * 18;
            const isSelected = selectedId === p.shipmentId;
            return (
              <g key={p.shipmentId} data-testid={`map-route-${p.shipmentId}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 9 : 6}
                  fill={p.hasLivePosition ? "#059669" : "#64748b"}
                  stroke={isSelected ? "#0f172a" : "white"}
                  strokeWidth={2}
                  className="cursor-pointer"
                  onClick={() => onSelect?.(p.shipmentId)}
                />
                <text x={x} y={y - 14} textAnchor="middle" className="fill-slate-600 text-[10px]">
                  {p.shipmentNumber.slice(-8)}
                </text>
              </g>
            );
          })}
          <circle cx="60" cy="100" r="8" fill="#0f766e" />
          <text x="60" y="130" textAnchor="middle" className="fill-slate-700 text-[11px] font-medium">Origin</text>
          <circle cx="740" cy="100" r="8" fill="#1e3a8a" />
          <text x="740" y="130" textAnchor="middle" className="fill-slate-700 text-[11px] font-medium">Destination</text>
        </svg>
      </div>

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
