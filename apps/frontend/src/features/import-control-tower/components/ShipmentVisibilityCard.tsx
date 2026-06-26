import type { ShipmentVisibilitySummary } from "@dmx/contracts/import-control-tower";

export function ShipmentVisibilityCard({ data }: { data: ShipmentVisibilitySummary }) {
  return (
    <section data-testid="ict-shipment-visibility" className="dmx-card p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-4">Shipment Visibility</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="At Sea" value={data.containersAtSea} testId="ict-at-sea" />
        <Stat label="Avg ETA (days)" value={data.averageEtaDays ?? "—"} testId="ict-avg-eta" />
        <Stat label="Arrivals This Week" value={data.arrivalsThisWeek} testId="ict-arrivals-week" />
        <Stat label="Delayed" value={data.delayedShipments} testId="ict-delayed-shipments" />
        <Stat label="On Time" value={data.onTimeShipments} testId="ict-on-time" />
      </div>
      {data.carrierDistribution.length > 0 && (
        <div data-testid="ict-carrier-distribution">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Carrier Distribution</div>
          <div className="flex flex-wrap gap-2">
            {data.carrierDistribution.map((c) => (
              <span key={c.carrier} className="rounded-full border border-zinc-200 px-3 py-1 text-xs">
                {c.carrier} <span className="font-semibold tabular-nums">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
