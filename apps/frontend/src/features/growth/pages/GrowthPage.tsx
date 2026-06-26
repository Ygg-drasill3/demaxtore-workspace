import { useQuery } from "@tanstack/react-query";
import { growthApi } from "../lib/growth.api";

export default function GrowthPage() {
  const { data: insight, isLoading, isError, refetch } = useQuery({
    queryKey: ["growth", "insights"],
    queryFn: growthApi.insights,
  });
  const { data: procurement } = useQuery({
    queryKey: ["growth", "procurement-strategy"],
    queryFn: growthApi.procurementStrategy,
  });

  if (isLoading) {
    return <div data-testid="growth-loading" className="p-8 text-sm text-zinc-500">Loading…</div>;
  }

  if (isError || !insight) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load growth insights.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const i = insight;

  return (
    <div data-testid="growth-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Growth intelligence</h1>
          <p className="text-sm text-zinc-500">Commercial funnel, conversion & leakage (admin only)</p>
        </div>
        <a
          href="/api/growth/export/funnel.csv"
          data-testid="growth-csv-export"
          className="text-sm text-primary underline"
        >
          Export funnel (CSV)
        </a>
      </header>

      <section className="dmx-card p-4" data-testid="growth-procurement-strategy">
        <h2 className="text-sm font-medium mb-2">Procurement strategy (Sprint 11A)</h2>
        <ul className="text-xs space-y-1 tabular-nums">
          <li>Direct RFQ: {procurement?.directRfqCount ?? 0} · PO issued {procurement?.directRfqPoIssued ?? 0} · conv {procurement?.directRfqConversionRate ?? "—"}%</li>
          <li>CommodityBid Auction: {procurement?.commodityBidCount ?? 0} · orders {procurement?.commodityBidOrdersSpawned ?? 0} · conv {procurement?.auctionConversionRate ?? "—"}%</li>
          <li>Pending strategy: {procurement?.pendingStrategyCount ?? 0}</li>
          <li>Revenue Direct RFQ: ${procurement?.revenueDirectRfqUsd ?? 0} · CommodityBid: ${procurement?.revenueCommodityBidUsd ?? 0}</li>
        </ul>
      </section>

      <section className="dmx-card p-4" data-testid="growth-commercial-funnel">
        <h2 className="text-sm font-medium mb-2">Commercial funnel</h2>
        <p className="text-xs text-zinc-500 mb-2">
          Overall conversion: {i?.funnel?.overallConversionPercent ?? 0}% · {i?.funnel?.totalRfqs ?? 0} RFQs
        </p>
        <ul className="text-xs space-y-1">
          {(i?.funnel?.stages ?? []).map((s) => (
            <li key={s.stage}>
              {s.label}: {s.count} · conv {s.conversionPercent}% · drop {s.dropoffPercent}%
            </li>
          ))}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="growth-conversion-metrics">
          <h2 className="text-sm font-medium mb-2">Conversion metrics</h2>
          <ul className="text-xs space-y-1 tabular-nums">
            <li>RFQ → PO: {i?.conversion?.rfqToPoPercent ?? 0}%</li>
            <li>Quote → Select: {i?.conversion?.quoteToSelectPercent ?? 0}%</li>
            <li>PO → Order: {i?.conversion?.poToOrderPercent ?? 0}%</li>
            <li>Order → Shipment: {i?.conversion?.orderToShipmentPercent ?? 0}%</li>
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="growth-dropoffs">
          <h2 className="text-sm font-medium mb-2">Drop-offs</h2>
          <ul className="text-xs space-y-1">
            {(i?.dropoffs ?? []).slice(0, 6).map((d) => (
              <li key={d.stage}>{d.label}: {d.dropoffCount} ({d.dropoffPercent}%)</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="growth-buyer-activation">
          <h2 className="text-sm font-medium mb-2">Buyer activation</h2>
          <p className="text-xs mb-2">
            Cold {i?.activationSummary?.cold ?? 0} · Warm {i?.activationSummary?.warm ?? 0} · Active{" "}
            {i?.activationSummary?.active ?? 0} · Power {i?.activationSummary?.powerBuyer ?? 0}
          </p>
          <ul className="text-xs space-y-1">
            {(i?.buyerActivation ?? []).slice(0, 8).map((b) => (
              <li key={b.organisationId}>
                {b.organisationName}: {b.classification} ({b.activationScore})
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="growth-supplier-performance">
          <h2 className="text-sm font-medium mb-2">Supplier performance</h2>
          <ul className="text-xs space-y-1">
            {(i?.supplierPerformance ?? []).slice(0, 8).map((s) => (
              <li key={s.organisationId}>
                {s.organisationName}: {s.classification} · win {(s.winRate * 100).toFixed(0)}%
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="growth-category-revenue">
          <h2 className="text-sm font-medium mb-2">Category revenue</h2>
          <ul className="text-xs space-y-1">
            {(i?.categories ?? []).slice(0, 8).map((c) => (
              <li key={c.category}>
                {c.category}: {c.rfqCount} RFQs · {c.freightiqRevenueUsd} FreightIQ
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="growth-route-revenue">
          <h2 className="text-sm font-medium mb-2">Route revenue</h2>
          <ul className="text-xs space-y-1">
            {(i?.routes ?? []).slice(0, 8).map((r) => (
              <li key={r.route}>
                {r.lane}: {r.freightiqRevenueUsd} margin
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="growth-repeat-customers">
          <h2 className="text-sm font-medium mb-2">Repeat customers</h2>
          <ul className="text-xs space-y-1">
            {(i?.repeatCustomers ?? []).map((r) => (
              <li key={r.horizonDays}>
                {r.horizonDays}d: repeat rate {(r.repeatRate * 100).toFixed(0)}% · {r.repeatBuyers} buyers
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="growth-lost-opportunities">
          <h2 className="text-sm font-medium mb-2">Lost opportunities</h2>
          <p className="text-xs text-zinc-500 mb-1">
            Est. lost FreightIQ: {i?.lostOpportunities?.totalEstimatedLostFreightiqRevenueUsd ?? 0} USD
          </p>
          <ul className="text-xs space-y-1">
            {(i?.lostOpportunities?.items ?? []).slice(0, 6).map((o) => (
              <li key={`${o.type}-${o.workspaceId}`}>
                {o.workspaceRef}: {o.type}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dmx-card p-4" data-testid="growth-trends">
        <h2 className="text-sm font-medium mb-2">Growth trends</h2>
        <ul className="text-xs space-y-1">
          {(i?.trends ?? []).map((t) => (
            <li key={t.period}>
              {t.period}: RFQs {t.rfqsCreated} · POs {t.posIssued} · FreightIQ {t.freightiqRevenueUsd}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
