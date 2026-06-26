import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../lib/market.api";

export default function MarketIntelligencePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["market", "insights"],
    queryFn: marketApi.insights,
  });

  if (isLoading) {
    return <div data-testid="market-loading" className="p-8 text-sm text-zinc-500">Loading…</div>;
  }

  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load market intelligence.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const m = data;

  return (
    <div data-testid="market-intelligence-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Market intelligence</h1>
          <p className="text-sm text-zinc-500">Opportunities & priorities from platform trade data (admin only)</p>
        </div>
        <a
          href="/api/market/export/categories.csv"
          data-testid="market-csv-export"
          className="text-sm text-primary underline"
        >
          Export categories (CSV)
        </a>
      </header>

      <section className="dmx-card p-4" data-testid="market-top-opportunities">
        <h2 className="text-sm font-medium mb-2">Top opportunities</h2>
        <ul className="text-xs space-y-1">
          {(m?.topOpportunities ?? []).map((o) => (
            <li key={`${o.type}-${o.ref}`}>
              [{o.score}] {o.type}: {o.summary}
            </li>
          ))}
          {!m?.topOpportunities?.length && <li className="text-zinc-500">No ranked opportunities yet</li>}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="market-category-trends">
          <h2 className="text-sm font-medium mb-2">Category trends</h2>
          <ul className="text-xs space-y-1">
            {(m?.categoryOpportunities ?? []).slice(0, 8).map((c) => (
              <li key={c.category}>
                {c.category}: {c.trend} · {c.rfqVolume} RFQs · score {c.opportunityScore}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="market-country-demand">
          <h2 className="text-sm font-medium mb-2">Country demand</h2>
          <ul className="text-xs space-y-1">
            {(m?.demandHotspots ?? []).slice(0, 8).map((c) => (
              <li key={c.country}>
                {c.country}: demand {c.demandScore} · {c.rfqCount} RFQs · {c.growthPercent}% growth
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="market-supply-gaps">
          <h2 className="text-sm font-medium mb-2">Supply gaps</h2>
          <ul className="text-xs space-y-1">
            {(m?.supplyGaps ?? []).slice(0, 6).map((g) => (
              <li key={`${g.category}-${g.country}`}>
                {g.category} → {g.country ?? "global"}: score {g.opportunityScore}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="market-route-opportunities">
          <h2 className="text-sm font-medium mb-2">Route opportunities</h2>
          <ul className="text-xs space-y-1">
            {(m?.routeOpportunities ?? []).slice(0, 6).map((r) => (
              <li key={r.route}>
                {r.lane}: score {r.opportunityScore} · margin {r.marginUsd}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="market-buyer-opportunities">
          <h2 className="text-sm font-medium mb-2">Buyer opportunities</h2>
          <ul className="text-xs space-y-1">
            {(m?.buyerOpportunities ?? []).slice(0, 6).map((b) => (
              <li key={`${b.organisationId}-${b.issue}`}>
                {b.organisationName}: {b.issue} (est. {b.potentialFreightiqRevenueUsd} FreightIQ)
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="market-forwarder-opportunities">
          <h2 className="text-sm font-medium mb-2">Forwarder opportunities</h2>
          <ul className="text-xs space-y-1">
            {(m?.forwarderOpportunities ?? []).slice(0, 6).map((f) => (
              <li key={f.forwarderId ?? f.forwarderName}>
                {f.forwarderName}: {f.classification} · {f.offerVolume} offers
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dmx-card p-4" data-testid="market-recommendations">
        <h2 className="text-sm font-medium mb-2">Recommendations (rule-based)</h2>
        <ul className="text-xs space-y-2">
          {(m?.recommendations ?? []).map((r) => (
            <li key={r.id}>
              <span className="font-medium uppercase text-zinc-500">{r.priority}</span> — {r.action}
              <div className="text-zinc-500">{r.reason}</div>
            </li>
          ))}
          {!m?.recommendations?.length && <li className="text-zinc-500">No recommendations</li>}
        </ul>
      </section>
    </div>
  );
}
