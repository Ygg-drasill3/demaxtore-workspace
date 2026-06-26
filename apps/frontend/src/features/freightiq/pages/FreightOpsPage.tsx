import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { freightiqApi } from "../lib/freightiq.api";
import { QueryState } from "@/components/ui/QueryState";

export default function FreightOpsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["freightiq", "ops"],
    queryFn: freightiqApi.opsOverview,
  });

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError || (!isLoading && !data)}
      onRetry={() => void refetch()}
      errorMessage="Could not load freight operations."
    >
      {data ? (
        <div data-testid="freight-ops-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
          <header>
            <h1 className="font-display text-3xl font-semibold">Freight operations</h1>
            <p className="text-sm text-zinc-500">FreightIQ coordination — read-only ops view</p>
          </header>
          <OpsBlock title="Open freight requests" testId="freight-ops-open" rows={data.openRequests ?? []} />
          <OpsBlock title="Pending communications" testId="freight-ops-pending-comms" count={(data.pendingCommunications ?? []).length} />
          <OpsBlock title="Waiting responses" testId="freight-ops-waiting" count={(data.waitingResponses ?? []).length} />
          <OpsBlock title="Pending offers" testId="freight-ops-pending" count={(data.pendingOffers ?? []).length} />
          <OpsBlock title="Expired offers" testId="freight-ops-expired" count={(data.expiredOffers ?? []).length} />
          {data.commercialMetrics && (
            <section data-testid="freight-ops-commercial-kpis" className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="dmx-card p-3 text-xs">
                <span className="text-zinc-500">Freight volume</span>
                <div className="text-lg font-semibold" data-testid="freight-ops-kpi-volume">{data.commercialMetrics.freightVolume}</div>
              </div>
              <div className="dmx-card p-3 text-xs">
                <span className="text-zinc-500">Revenue pending</span>
                <div className="text-lg font-semibold" data-testid="freight-ops-kpi-pending">{data.commercialMetrics.revenuePendingUsd}</div>
              </div>
              <div className="dmx-card p-3 text-xs">
                <span className="text-zinc-500">Revenue realized</span>
                <div className="text-lg font-semibold" data-testid="freight-ops-kpi-realized">{data.commercialMetrics.revenueRealizedUsd}</div>
              </div>
              <div className="dmx-card p-3 text-xs">
                <span className="text-zinc-500">Avg margin</span>
                <div className="text-lg font-semibold" data-testid="freight-ops-kpi-avg-margin">{(data.commercialMetrics.averageMarginUsd ?? 0).toFixed(0)}</div>
              </div>
              <div className="dmx-card p-3 text-xs md:col-span-2">
                <span className="text-zinc-500">Top routes</span>
                <ul className="mt-1">
                  {(data.commercialMetrics.topRoutes ?? []).map((r) => (
                    <li key={r.route}>{r.route} · {r.marginUsd} USD</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          <section data-testid="freight-ops-selected" className="dmx-card p-4">
            <h2 className="text-sm font-medium mb-2">Selected freight</h2>
            <ul className="text-xs space-y-1">
              {(data.selectedFreight ?? []).map((r) => (
                <li key={r.id}>
                  <Link to={`/workspace/order/${r.orderId}`} className="text-blue-800">{r.orderRef ?? r.orderId}</Link>
                  {" · "}{r.status}
                </li>
              ))}
              {!data.selectedFreight?.length && <li className="text-zinc-500">None</li>}
            </ul>
          </section>
        </div>
      ) : null}
    </QueryState>
  );
}

function OpsBlock({
  title,
  testId,
  rows,
  count,
}: {
  title: string;
  testId: string;
  rows?: Array<{ id: string; orderId: string; status: string; pol: string; pod: string; offerCount?: number }>;
  count?: number;
}) {
  return (
    <section className="dmx-card p-4" data-testid={testId}>
      <h2 className="text-sm font-medium mb-2">{title}</h2>
      {rows ? (
        <ul className="text-xs space-y-1">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/workspace/order/${r.orderId}`} className="text-blue-800">Order</Link>
              {" "}{r.pol}→{r.pod} · {r.status} · {r.offerCount ?? 0} offers
            </li>
          ))}
          {!rows.length && <li className="text-zinc-500">None</li>}
        </ul>
      ) : (
        <p className="text-xs text-zinc-600">{count ?? 0} items</p>
      )}
    </section>
  );
}
