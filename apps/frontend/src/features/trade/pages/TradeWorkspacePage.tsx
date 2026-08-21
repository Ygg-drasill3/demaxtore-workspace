import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { tradeApi } from "../lib/trade.api";
import { exceptionHubApi } from "@/features/exception-hub/lib/exception-hub.api";
import type { TradeDocumentCategory, TradeDocumentItem } from "@dmx/contracts/trade-workspace";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { TradeFinancialPanel } from "../components/TradeFinancialPanel";
import { IncotermResponsibilityMap } from "../components/IncotermResponsibilityMap";
import { TradeTimeline } from "../components/TradeTimeline";
import { showQueryFatalError } from "@/lib/query-guards";
import { getApiErrorMessage } from "@/lib/api-errors";

const DOC_CATEGORIES: TradeDocumentCategory[] = [
  "Proforma",
  "Invoice",
  "Packing List",
  "BL",
  "COO",
  "Health Certificate",
  "Inspection Reports",
  "Contracts",
  "Other",
];

function Panel({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-zinc-500">{text}</p>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink-900 tabular-nums">{value}</div>
    </div>
  );
}

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return "—";
  return `${currency ?? "USD"} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function TradeWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [docQuery, setDocQuery] = useState("");
  const [docCategory, setDocCategory] = useState<TradeDocumentCategory | "ALL">("ALL");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["trade-workspace", id],
    queryFn: () => tradeApi.getWorkspace(id!),
    enabled: !!id,
  });

  const { data: exceptions } = useQuery({
    queryKey: ["trade-exceptions", id],
    queryFn: () => exceptionHubApi.tradeExceptions(id!),
    enabled: !!id,
  });

  const filteredDocs = useMemo(() => {
    if (!data) return [];
    return data.documents.filter((d: TradeDocumentItem) => {
      if (docCategory !== "ALL" && d.category !== docCategory) return false;
      if (!docQuery.trim()) return true;
      const q = docQuery.toLowerCase();
      return (
        (d.fileName ?? "").toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q) ||
        d.workspaceRef.toLowerCase().includes(q)
      );
    });
  }, [data, docQuery, docCategory]);

  if (isLoading && !data) return <PageSkeleton />;
  if (showQueryFatalError({ isLoading, isError, data })) {
    return (
      <div data-testid="trade-workspace-error" className="max-w-3xl mx-auto p-8 text-center space-y-3">
        <p className="text-red-600">{getApiErrorMessage(error, "Could not load trade workspace.")}</p>
        <button type="button" className="dmx-btn-secondary" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }
  if (!data) return <PageSkeleton />;

  const { header, summary } = data;

  return (
    <div data-testid="trade-workspace" data-guide="trade-workspace" className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <header
        data-testid="trade-workspace-header"
        className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white p-6 sm:p-8 shadow-lg"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">Unified Trade Execution</div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{header.tradeId}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1">{header.tradeType}</span>
              <span className="rounded-full bg-accent-500/20 px-3 py-1 text-accent-100">{header.currentStatus}</span>
              {header.incoterm && <span className="rounded-full bg-white/10 px-3 py-1">{header.incoterm}</span>}
              <Link
                to={`/workspace/trade/${header.rootWorkspaceId}/documents`}
                data-testid="trade-workspace-documents-link"
                className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition-colors"
              >
                All documents →
              </Link>
              <Link
                to="/alerts"
                data-testid="trade-workspace-exceptions-link"
                className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition-colors"
              >
                Alerts →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[280px]">
            <Stat label="Buyer" value={header.buyerName} />
            <Stat label="Manufacturer" value={header.manufacturerName} />
            <Stat label="Containers" value={header.containerCount} />
            <Stat label="Trade value" value={formatMoney(header.tradeValue, header.currency)} />
            <Stat label="Last activity" value={header.lastActivityAt ? new Date(header.lastActivityAt).toLocaleString() : "—"} />
          </div>
        </div>
      </header>

      {/* Summary */}
      <Panel title="Trade Summary" testId="trade-summary-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Products" value={<span className="text-xs leading-snug">{summary.products}</span>} />
          <Stat label="Container type" value={summary.containerType ?? "—"} />
          <Stat label="Order value" value={formatMoney(summary.orderValue, summary.currency)} />
          <Stat label="Freight value" value={formatMoney(summary.freightValue, summary.currency)} />
          <Stat label="Service fee" value={formatMoney(summary.serviceFee, summary.currency)} />
          <Stat label="Total trade value" value={formatMoney(summary.totalTradeValue, summary.currency)} />
          <Stat label="Milestone" value={summary.currentMilestone} />
        </div>
      </Panel>

      {header.incoterm && (
        <Panel title="Incoterms & Responsibility" testId="trade-incoterm-panel">
          <IncotermResponsibilityMap incoterm={header.incoterm} />
        </Panel>
      )}

      <Panel title="Freight estimate" testId="trade-freight-estimate-panel">
        {data.freightEstimate.current ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span
                data-testid="trade-estimate-expiration"
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-zinc-200"
              >
                {data.freightEstimate.expirationStatus.replace(/_/g, " ")}
              </span>
              {data.freightEstimate.lastRefresh && (
                <span className="text-xs text-zinc-500">
                  Last refresh: {new Date(data.freightEstimate.lastRefresh).toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="FOB" value={formatMoney(data.freightEstimate.current.fobValue, data.freightEstimate.current.currency)} />
              <Stat label="Est. Freight" value={formatMoney(data.freightEstimate.current.estimatedFreight, data.freightEstimate.current.currency)} />
              <Stat label="Est. CIF" value={formatMoney(data.freightEstimate.current.estimatedCifValue, data.freightEstimate.current.currency)} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-600">
              <span>Estimate date: {new Date(data.freightEstimate.current.estimatedAt).toLocaleDateString()}</span>
              <span>Expires: {new Date(data.freightEstimate.current.expiresAt).toLocaleDateString()}</span>
            </div>
            {data.freightEstimate.history.length > 0 && (
              <div data-testid="trade-estimate-history">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Historical estimates</div>
                <ul className="space-y-1 text-xs text-zinc-600">
                  {data.freightEstimate.history.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      {new Date(h.estimatedAt).toLocaleDateString()} · {formatMoney(h.estimatedCifValue, h.currency)} CIF · {h.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Empty text="No freight estimate generated for this trade yet." />
        )}
      </Panel>

      <Panel title="Freight booking" testId="trade-freight-booking-panel">
        {data.freightBooking.forecast || data.freightBooking.bookingStatus ? (
          <div className="space-y-4">
            {data.freightBooking.bookingStatus && (
              <span
                data-testid="trade-booking-status"
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-zinc-200"
              >
                {data.freightBooking.bookingStatus.replace(/_/g, " ")}
              </span>
            )}
            {data.freightBooking.forecast && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <Stat label="Production start" value={new Date(data.freightBooking.forecast.productionStartDate).toLocaleDateString()} />
                <Stat label="Production finish" value={new Date(data.freightBooking.forecast.estimatedProductionFinishDate).toLocaleDateString()} />
                <Stat label="Cargo ready" value={new Date(data.freightBooking.forecast.estimatedCargoReadyDate).toLocaleDateString()} />
              </div>
            )}
            {data.freightBooking.recommendedCarrier && (
              <div data-testid="trade-booking-recommended">
                <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-1">
                  {data.freightBooking.bestOverallLabel ?? "Recommended"}
                </div>
                <div className="text-sm">
                  {data.freightBooking.recommendedCarrier.carrierName} · {data.freightBooking.recommendedCarrier.vesselName}
                  <span className="text-zinc-500 ml-2">Score {data.freightBooking.recommendedCarrier.recommendationScore}</span>
                </div>
              </div>
            )}
            {data.freightBooking.selectedCarrier && (
              <div data-testid="trade-booking-selected" className="text-sm">
                Selected: {data.freightBooking.selectedCarrier.carrierName} · {data.freightBooking.selectedCarrier.vesselName}
                ({data.freightBooking.selectedCarrier.transitDays}d transit)
              </div>
            )}
            {data.freightBooking.carrierOptions.length > 0 && (
              <div data-testid="trade-booking-carrier-count" className="text-xs text-zinc-500">
                {data.freightBooking.carrierOptions.length} carrier option(s) available
              </div>
            )}
          </div>
        ) : (
          <Empty text="No freight booking plan for this trade yet." />
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* PO */}
        <Panel title="Purchase Orders" testId="trade-po-panel">
          {data.purchaseOrders.length === 0 ? (
            <Empty text="No purchase orders linked yet." />
          ) : (
            <div className="space-y-3">
              {data.purchaseOrders.map((po) => (
                <div key={po.poId} className="rounded-lg border border-zinc-100 p-3 text-sm" data-testid={`trade-po-${po.poId}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-mono font-medium">{po.poNumber}</span>
                    <span className="text-zinc-500">{po.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                    <span>Date: {po.poDate ? new Date(po.poDate).toLocaleDateString() : "—"}</span>
                    <span>Value: {formatMoney(po.poValue, po.currency)}</span>
                    <span>Order: {po.orderRef}</span>
                  </div>
                  <Link to={po.workspaceUrl} className="mt-2 inline-flex items-center gap-1 text-xs text-accent-900 hover:underline">
                    Open PO <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Orders */}
        <Panel title="Orders" testId="trade-order-panel">
          {data.orders.length === 0 ? (
            <Empty text="No orders spawned for this trade yet." />
          ) : (
            <div className="space-y-3">
              {data.orders.map((o) => (
                <div key={o.orderId} className="rounded-lg border border-zinc-100 p-3 text-sm" data-testid={`trade-order-${o.orderId}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-mono font-medium">{o.orderRef}</span>
                    <span className="text-zinc-500">{o.status}</span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-600 space-y-1">
                    <div>Products: {o.products}</div>
                    <div>Production: {o.productionStatus}</div>
                  </div>
                  <Link to={o.workspaceUrl} className="mt-2 inline-flex items-center gap-1 text-xs text-accent-900 hover:underline">
                    Open order <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Freight */}
        <Panel title="Freight" testId="trade-freight-panel">
          {data.freight.length === 0 ? (
            <Empty text="No freight requests yet." />
          ) : (
            <div className="space-y-3">
              {data.freight.map((f) => (
                <div key={f.orderId} className="rounded-lg border border-zinc-100 p-3 text-sm">
                  <div className="font-medium">{f.carrier ?? "Carrier TBD"}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                    <span>Route: {f.route ?? "—"}</span>
                    <span>Status: {f.trackingStatus}</span>
                    <span>ETD: {f.etd ? new Date(f.etd).toLocaleDateString() : "—"}</span>
                    <span>ETA: {f.eta ? new Date(f.eta).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {data.orders[0]?.orderId && (
          <Panel title="Financial Milestones" testId="trade-financial-panel-wrap">
            <TradeFinancialPanel orderId={data.orders[0].orderId} />
          </Panel>
        )}

        {/* Shipments */}
        <Panel title="Shipments" testId="trade-shipment-panel">
          {data.shipments.length === 0 ? (
            <Empty text="No shipments yet." />
          ) : (
            <div className="space-y-3">
              {data.shipments.map((s) => (
                <div key={s.shipmentId} className="rounded-lg border border-zinc-100 p-3 text-sm" data-testid={`trade-shipment-${s.shipmentId}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-mono font-medium">{s.shipmentRef}</span>
                    <span className="text-zinc-500">{s.status}</span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-600 space-y-1">
                    <div>Location: {s.currentLocation ?? "—"}</div>
                    <div>Latest: {s.latestUpdate ?? "—"}</div>
                  </div>
                  <Link to={s.workspaceUrl} className="mt-2 inline-flex items-center gap-1 text-xs text-accent-900 hover:underline">
                    Open shipment <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Document Center */}
      <Panel title="Document Center" testId="trade-document-center">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="trade-doc-search"
              type="search"
              placeholder="Search documents…"
              value={docQuery}
              onChange={(e) => setDocQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            data-testid="trade-doc-category-filter"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as TradeDocumentCategory | "ALL")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All categories</option>
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {filteredDocs.length === 0 ? (
          <Empty text="No documents match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="text-left py-2">File</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d) => (
                  <tr key={d.id} className="border-t border-zinc-100" data-testid={`trade-doc-${d.id}`}>
                    <td className="py-2">
                      <Link to={`/documents/${encodeURIComponent(d.detailId)}`} className="hover:underline">
                        {d.fileName ?? d.documentType}
                      </Link>
                    </td>
                    <td className="py-2">{d.category}</td>
                    <td className="py-2">{d.status}</td>
                    <td className="py-2 font-mono text-xs">{d.workspaceRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Trade Timeline" testId="trade-timeline-panel">
        <TradeTimeline tradeId={header.rootWorkspaceId} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Control Tower */}
        <Panel title="Control Tower Alerts" testId="trade-alerts-panel">
          {data.alerts.length === 0 ? (
            <Empty text="No open alerts for this trade." />
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto dmx-thin-scroll">
              {data.alerts.map((a) => (
                <div
                  key={a.id}
                  data-testid={`trade-alert-${a.id}`}
                  className={`rounded-lg border p-3 text-sm ${a.status === "OPEN" ? "border-amber-200 bg-amber-50/50" : "border-zinc-100"}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-xs uppercase text-zinc-500">{a.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{a.description}</p>
                  <div className="mt-2 text-xs text-zinc-500">{a.category} · {a.status}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Exception Panel */}
      <Panel title="Exceptions" testId="trade-exceptions-panel">
        {!exceptions ? (
          <Empty text="Loading exceptions…" />
        ) : exceptions.open.length === 0 && exceptions.resolved.length === 0 ? (
          <Empty text="No exceptions for this trade." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Open ({exceptions.open.length})</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto dmx-thin-scroll">
                {exceptions.open.length === 0 ? (
                  <Empty text="No open exceptions." />
                ) : (
                  exceptions.open.map((ex) => (
                    <Link
                      key={ex.id}
                      to={ex.detailUrl}
                      data-testid={`trade-exception-open-${ex.id}`}
                      className="block rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm hover:bg-amber-50"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-xs">{ex.exceptionRef}</span>
                        <span className="text-[10px] uppercase text-red-700">{ex.severity}</span>
                      </div>
                      <div className="mt-1 font-medium">{ex.exceptionType}</div>
                      <div className="text-xs text-zinc-500 mt-1">{ex.status}{ex.requiredAction ? ` · ${ex.requiredAction}` : ""}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Resolved ({exceptions.resolved.length})</h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto dmx-thin-scroll">
                {exceptions.resolved.length === 0 ? (
                  <Empty text="No resolved exceptions yet." />
                ) : (
                  exceptions.resolved.slice(0, 10).map((ex) => (
                    <Link
                      key={ex.id}
                      to={ex.detailUrl}
                      data-testid={`trade-exception-resolved-${ex.id}`}
                      className="block rounded-lg border border-zinc-100 p-3 text-sm hover:bg-zinc-50"
                    >
                      <div className="font-mono text-xs text-zinc-500">{ex.exceptionRef}</div>
                      <div className="mt-1">{ex.exceptionType}</div>
                      <div className="text-xs text-emerald-700 mt-1">{ex.status}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Related Records */}
      <Panel title="Related Records" testId="trade-related-panel">
        <div className="flex flex-wrap gap-2">
          {data.relatedRecords.map((r) => (
            <Link
              key={`${r.type}-${r.id}`}
              to={r.url}
              data-testid={`trade-related-${r.type}-${r.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <span className="text-xs uppercase text-zinc-500">{r.type}</span>
              <span className="font-mono">{r.ref}</span>
              <span className="text-zinc-400">{r.state}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
