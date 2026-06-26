import { useQuery } from "@tanstack/react-query";
import { freightiqApi } from "../lib/freightiq.api";

export default function FreightCommercialPage() {
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["freightiq", "commercial-report"],
    queryFn: freightiqApi.commercialReport,
  });
  const { data: insight, isLoading: insightLoading } = useQuery({
    queryKey: ["freightiq", "commercial-insight"],
    queryFn: freightiqApi.commercialInsight,
  });
  const { data: scorecard } = useQuery({
    queryKey: ["freightiq", "forwarder-scorecard"],
    queryFn: freightiqApi.forwarderScorecard,
  });

  if (reportLoading || insightLoading) {
    return <div data-testid="freight-commercial-loading" className="p-8 text-sm text-zinc-500">Loading…</div>;
  }

  const m = report?.metrics;

  return (
    <div data-testid="freight-commercial-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">FreightIQ commercial</h1>
          <p className="text-sm text-zinc-500">Revenue optimization & margin intelligence (admin only)</p>
        </div>
        <a
          href="/api/freightiq/commercial/analytics/export/revenue-by-route.csv"
          data-testid="freight-csv-export"
          className="text-sm text-primary underline"
        >
          Export revenue by route (CSV)
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="freight-commercial-kpis">
        <Kpi testId="freight-kpi-revenue-this-month" label="Revenue this month" value={insight?.revenueThisMonth ?? 0} />
        <Kpi testId="freight-kpi-revenue-last-month" label="Revenue last month" value={insight?.revenueLastMonth ?? 0} />
        <Kpi testId="freight-kpi-total-realized" label="Realized revenue" value={insight?.realizedRevenue ?? m?.revenueRealizedUsd ?? 0} />
        <Kpi testId="freight-kpi-pending" label="Pending revenue" value={insight?.pendingRevenue ?? m?.revenuePendingUsd ?? 0} />
        <Kpi testId="freight-kpi-avg-margin" label="Avg margin" value={insight?.averageMargin ?? m?.averageMarginUsd ?? 0} />
        <Kpi testId="freight-kpi-revenue-per-container" label="Revenue per container" value={insight?.revenuePerContainer ?? 0} />
        <Kpi testId="freight-kpi-volume" label="Freight volume" value={m?.freightVolume ?? 0} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="freight-top-routes">
          <h2 className="text-sm font-medium mb-2">Top routes</h2>
          <ul className="text-xs space-y-1">
            {(insight?.topRoutes ?? []).map((r) => (
              <li key={r.route}>{r.lane}: margin {r.marginUsd}</li>
            ))}
            {!insight?.topRoutes?.length && <li className="text-zinc-500">No route data</li>}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="freight-bottom-routes">
          <h2 className="text-sm font-medium mb-2">Bottom routes</h2>
          <ul className="text-xs space-y-1">
            {(insight?.bottomRoutes ?? []).map((r) => (
              <li key={r.route}>{r.lane}: margin {r.marginUsd}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dmx-card p-4" data-testid="freight-forwarder-scorecard">
        <h2 className="text-sm font-medium mb-2">Forwarder scorecard</h2>
        <ul className="text-xs space-y-1">
          {(scorecard ?? insight?.forwarderScorecards ?? []).slice(0, 10).map((f) => (
            <li key={f.forwarderName}>
              {f.forwarderName}: win {(f.winRate * 100).toFixed(0)}% · revenue {f.revenueGeneratedUsd}
            </li>
          ))}
          {!scorecard?.length && <li className="text-zinc-500">No forwarder metrics yet</li>}
        </ul>
      </section>

      <section className="dmx-card p-4" data-testid="freight-margin-distribution">
        <h2 className="text-sm font-medium mb-2">Margin distribution</h2>
        <ul className="text-xs space-y-1">
          {(insight?.marginDistribution ?? []).map((b) => (
            <li key={b.label}>{b.label}: {b.count}</li>
          ))}
        </ul>
      </section>

      <section className="dmx-card p-4" data-testid="freight-revenue-by-month">
        <h2 className="text-sm font-medium mb-2">Revenue by month</h2>
        <ul className="text-xs space-y-1">
          {(report?.revenueByMonth ?? []).map((row) => (
            <li key={row.month}>
              {row.month}: realized {row.realizedUsd} · pending {row.pendingUsd}
            </li>
          ))}
          {!report?.revenueByMonth?.length && <li className="text-zinc-500">No ledger data yet</li>}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="freight-revenue-by-route">
          <h2 className="text-sm font-medium mb-2">Revenue by route</h2>
          <ul className="text-xs space-y-1">
            {(insight?.revenueByRoute ?? report?.revenueByRoute ?? []).map((r) => (
              <li key={"route" in r ? r.route : (r as { route: string }).route}>
                {"lane" in r ? `${(r as { lane: string }).lane}: ${(r as { revenueUsd: number }).revenueUsd}` : `${(r as { route: string }).route}: ${(r as { realizedUsd?: number }).realizedUsd ?? 0} realized`}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="freight-revenue-by-forwarder">
          <h2 className="text-sm font-medium mb-2">Revenue by forwarder</h2>
          <ul className="text-xs space-y-1">
            {(insight?.revenueByForwarder ?? report?.revenueByForwarder ?? []).map((r) => (
              <li key={r.forwarder}>{r.forwarder}: {("revenueUsd" in r ? r.revenueUsd : (r as { realizedUsd: number }).realizedUsd)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dmx-card p-4" data-testid="freight-top-shipments">
        <h2 className="text-sm font-medium mb-2">Top 10 shipments (margin)</h2>
        <ul className="text-xs space-y-1">
          {(report?.topShipments ?? []).slice(0, 10).map((s) => (
            <li key={s.shipmentId}>
              {s.shipmentId.slice(0, 8)}… · margin {s.marginUsd} · {s.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="dmx-card p-3" data-testid={testId}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  );
}
