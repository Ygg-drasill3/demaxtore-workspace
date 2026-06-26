import { useQuery } from "@tanstack/react-query";
import { scaleApi } from "../lib/scale.api";

export default function ExecutivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["scale", "executive"],
    queryFn: scaleApi.executive,
  });

  if (isLoading) {
    return <div data-testid="executive-loading" className="p-8 text-sm text-zinc-500">Loading…</div>;
  }

  const e = data;

  return (
    <div data-testid="executive-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Executive operations</h1>
          <p className="text-sm text-zinc-500">Portfolio, forecast & scale readiness (admin only)</p>
        </div>
        <a
          href="/api/scale/export/customers.csv"
          data-testid="scale-csv-export"
          className="text-sm text-primary underline"
        >
          Export customers (CSV)
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="executive-kpis">
        <Kpi testId="exec-active-buyers" label="Active buyers" value={e?.activeBuyers ?? 0} />
        <Kpi testId="exec-active-suppliers" label="Active suppliers" value={e?.activeSuppliers ?? 0} />
        <Kpi testId="exec-open-rfqs" label="Open RFQs" value={e?.openRfqs ?? 0} />
        <Kpi testId="exec-open-orders" label="Open orders" value={e?.openOrders ?? 0} />
        <Kpi testId="exec-open-shipments" label="Open shipments" value={e?.openShipments ?? 0} />
      </section>

      <section className="grid md:grid-cols-3 gap-4" data-testid="executive-forecast">
        <ForecastCard label="30-day forecast" data={e?.revenueForecast30d} testId="exec-forecast-30d" />
        <ForecastCard label="60-day forecast" data={e?.revenueForecast60d} testId="exec-forecast-60d" />
        <ForecastCard label="90-day forecast" data={e?.revenueForecast90d} testId="exec-forecast-90d" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="executive-top-customers">
          <h2 className="text-sm font-medium mb-2">Top customers</h2>
          <ul className="text-xs space-y-1">
            {(e?.topCustomers ?? []).map((c) => (
              <li key={c.organisationId}>
                {c.organisationName}: score {c.commercialScore} · revenue {c.revenueGeneratedUsd}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="executive-top-suppliers">
          <h2 className="text-sm font-medium mb-2">Top suppliers</h2>
          <ul className="text-xs space-y-1">
            {(e?.topSuppliers ?? []).map((s) => (
              <li key={s.organisationId}>
                {s.organisationName}: score {s.commercialScore}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="executive-top-routes">
          <h2 className="text-sm font-medium mb-2">Top routes</h2>
          <ul className="text-xs space-y-1">
            {(e?.topRoutes ?? []).map((r) => (
              <li key={r.route}>{r.route}: {r.marginUsd}</li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="executive-top-forwarders">
          <h2 className="text-sm font-medium mb-2">Top forwarders</h2>
          <ul className="text-xs space-y-1">
            {(e?.topForwarders ?? []).map((f) => (
              <li key={f.forwarder}>{f.forwarder}: {f.revenueUsd}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="dmx-card p-3" data-testid={testId}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ForecastCard({
  label,
  data,
  testId,
}: {
  label: string;
  data?: { expectedFreightiqRevenueUsd: number; expectedContainerCount: number; expectedMarginUsd: number };
  testId: string;
}) {
  return (
    <div className="dmx-card p-4" data-testid={testId}>
      <h2 className="text-sm font-medium mb-2">{label}</h2>
      <div className="text-xs space-y-1 tabular-nums">
        <div>Revenue: {data?.expectedFreightiqRevenueUsd ?? 0}</div>
        <div>Containers: {data?.expectedContainerCount ?? 0}</div>
        <div>Margin: {data?.expectedMarginUsd ?? 0}</div>
      </div>
    </div>
  );
}
