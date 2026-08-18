import type { ShipmentBadgeGroup, ShipmentSummaryDto } from "@dmx/contracts/shipment-workspace";

const BADGE_CLASS: Record<ShipmentBadgeGroup, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  BOOKED: "bg-sky-100 text-sky-800",
  TRANSIT: "bg-amber-100 text-amber-900",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

function fmt(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return String(v);
  const d = Date.parse(v);
  if (!Number.isNaN(d) && /T/.test(v)) return new Date(v).toLocaleString();
  return v;
}

export function ShipmentSummaryPanel({ summary }: { summary: ShipmentSummaryDto }) {
  return (
    <section data-testid="shipment-summary" className="dmx-card p-4 space-y-3" aria-label="Shipment summary">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-medium">Shipment Summary</h2>
        <span
          data-testid="shipment-badge"
          data-badge={summary.badgeGroup}
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${BADGE_CLASS[summary.badgeGroup]}`}
        >
          {summary.badgeGroup}
        </span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs text-zinc-500">Shipment</dt><dd data-testid="shipment-summary-number">{summary.shipmentNumber}</dd></div>
        <div><dt className="text-xs text-zinc-500">Status</dt><dd data-testid="shipment-summary-status">{summary.status}</dd></div>
        <div><dt className="text-xs text-zinc-500">Mode</dt><dd>{summary.mode}</dd></div>
        <div><dt className="text-xs text-zinc-500">Carrier</dt><dd>{fmt(summary.carrier)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Forwarder</dt><dd>{fmt(summary.forwarder)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Incoterm</dt><dd>{fmt(summary.incoterm)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Origin</dt><dd>{summary.origin}</dd></div>
        <div><dt className="text-xs text-zinc-500">Destination</dt><dd>{summary.destination}</dd></div>
        <div><dt className="text-xs text-zinc-500">Containers</dt><dd>{summary.containerCount}</dd></div>
        <div><dt className="text-xs text-zinc-500">ETD</dt><dd>{fmt(summary.etd)}</dd></div>
        <div><dt className="text-xs text-zinc-500">ETA</dt><dd>{fmt(summary.eta)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Actual departure</dt><dd>{fmt(summary.actualDeparture)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Actual arrival</dt><dd>{fmt(summary.actualArrival)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Gross weight (kg)</dt><dd>{fmt(summary.totalGrossWeightKg)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Volume (cbm)</dt><dd>{fmt(summary.totalVolumeCbm)}</dd></div>
      </dl>
    </section>
  );
}
