import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shipmentApi } from "@/features/shipment/lib/shipment.api";

export function ShipmentMilestonesDashboardWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shipments", "milestones", "summary"],
    queryFn: () => shipmentApi.milestoneSummary(),
  });

  return (
    <section className="dmx-card p-4 space-y-3" data-testid="ops-milestones-widget">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Shipment Milestones</h2>
        <Link to="/shipments/portfolio" className="text-xs underline">Portfolio</Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : isError ? (
        <button type="button" className="text-sm text-red-600 underline" onClick={() => void refetch()}>
          Retry
        </button>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <Stat to="/shipments/portfolio" label="Upcoming" value={data.upcoming} />
          <Stat to="/shipments/portfolio" label="Delayed" value={data.delayed} />
          <Stat to="/shipments/portfolio" label="Departures today" value={data.departuresToday} />
          <Stat to="/shipments/portfolio" label="Deliveries today" value={data.deliveriesToday} />
          <Stat to="/shipments/portfolio" label="High risk" value={data.highRisk} />
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-lg border border-paper-100 p-2 hover:bg-paper-50">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </Link>
  );
}
