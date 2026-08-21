import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { AlertTriangle, Search, Ship } from "lucide-react";
import type {
  ShipmentPortfolioQuery,
  ShipmentPortfolioStatus,
  ShipmentPortfolioTradeType,
} from "@dmx/contracts/shipment-portfolio";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { cn } from "@/lib/utils";
import { shipmentPortfolioApi } from "../lib/shipment-portfolio.api";
import { ShipmentPortfolioMap } from "../components/ShipmentPortfolioMap";

const STATUSES: ShipmentPortfolioStatus[] = ["On Track", "At Risk", "Delayed", "Delivered", "Cancelled"];
const TRADE_TYPES: { value: ShipmentPortfolioTradeType; label: string }[] = [
  { value: "RFQ", label: "RFQ" },
  { value: "COMMODITYBID", label: "CommodityBid" },
  { value: "MIXED_CONTAINER", label: "SmartContainer" },
  { value: "BULK_CONTAINER", label: "BulkContainer" },
];

const STATUS_STYLES: Record<ShipmentPortfolioStatus, string> = {
  "On Track": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "At Risk": "bg-amber-50 text-amber-800 border-amber-200",
  Delayed: "bg-red-50 text-red-800 border-red-200",
  Delivered: "bg-zinc-100 text-zinc-600 border-zinc-200",
  Cancelled: "bg-zinc-50 text-zinc-400 border-zinc-100",
};

const HEALTH_STYLES = {
  Healthy: "text-emerald-700",
  Monitor: "text-amber-700",
  "At Risk": "text-red-700",
};

const EX_SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-900",
  High: "bg-orange-100 text-orange-900",
  Medium: "bg-amber-100 text-amber-900",
  Low: "bg-zinc-100 text-zinc-700",
};

function KpiCard({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function ShipmentPortfolioPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ShipmentPortfolioStatus | "">("");
  const [tradeType, setTradeType] = useState<ShipmentPortfolioTradeType | "">("");
  const [carrier, setCarrier] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const limit = 25;

  const queryParams = useMemo((): Partial<ShipmentPortfolioQuery> => ({
    limit,
    offset: page * limit,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(tradeType ? { tradeType } : {}),
    ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
    ...(country.trim() ? { country: country.trim() } : {}),
  }), [search, status, tradeType, carrier, country, page]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["shipment-portfolio", queryParams],
    queryFn: () => shipmentPortfolioApi.getPortfolio(queryParams),
    retry: (failureCount, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status === 429) return failureCount < 3;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1_500 * 2 ** attempt, 12_000),
  });

  if (isLoading) return <PageSkeleton />;

  if (isError || !data) {
    const status = (error as AxiosError<{ error?: { message?: string } }>)?.response?.status;
    const apiMessage = (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message;
    const message = status === 429
      ? "Too many requests — please wait a few seconds and try again."
      : apiMessage ?? "Could not load shipment portfolio.";

    return (
      <div data-testid="shipment-portfolio-error" className="max-w-3xl mx-auto p-8 text-center space-y-3">
        <p className="text-red-600">{message}</p>
        <button type="button" className="dmx-btn-secondary" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <div data-testid="shipment-portfolio" data-guide="shipment-portfolio" className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10">
      <header className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white p-6 sm:p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center">
            <Ship className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">Shipment Visibility</div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">My Shipments</h1>
            <p className="text-sm text-white/70 mt-2 max-w-2xl">
              Monitor all active shipments — status, delays, arrivals, and alerts in one place.
            </p>
          </div>
        </div>
      </header>

      <section data-testid="shipment-portfolio-kpis" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard testId="sp-kpi-active" label="Active Shipments" value={data.kpis.activeShipments} />
        <KpiCard testId="sp-kpi-arriving" label="Arriving This Week" value={data.kpis.arrivingThisWeek} />
        <KpiCard testId="sp-kpi-delayed" label="Delayed" value={data.kpis.delayedShipments} />
        <KpiCard testId="sp-kpi-delivered" label="Delivered This Month" value={data.kpis.deliveredThisMonth} />
        <KpiCard testId="sp-kpi-containers" label="Containers In Transit" value={data.kpis.containersInTransit} />
        <KpiCard testId="sp-kpi-alerts" label="Open Alerts" value={data.kpis.openAlerts} />
      </section>

      <section data-testid="shipment-portfolio-analytics" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Avg transit (days)", value: data.analytics.averageTransitDays ?? "—" },
          { label: "Delayed rate", value: data.analytics.delayedShipmentRate != null ? `${data.analytics.delayedShipmentRate}%` : "—" },
          { label: "On-time delivery", value: data.analytics.onTimeDeliveryPct != null ? `${data.analytics.onTimeDeliveryPct}%` : "—" },
          { label: "Shipment volume", value: data.analytics.shipmentVolume },
          { label: "Container volume", value: data.analytics.containerVolume },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
            <div className="text-sm font-semibold tabular-nums mt-1">{value}</div>
          </div>
        ))}
      </section>

      <section data-testid="shipment-portfolio-filters" className="dmx-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="sp-search"
              type="search"
              placeholder="Search trade ID, shipment, supplier, container…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            data-testid="sp-filter-status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as ShipmentPortfolioStatus | ""); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            data-testid="sp-filter-trade-type"
            value={tradeType}
            onChange={(e) => { setTradeType(e.target.value as ShipmentPortfolioTradeType | ""); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All trade types</option>
            {TRADE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            data-testid="sp-filter-carrier"
            type="text"
            placeholder="Carrier"
            value={carrier}
            onChange={(e) => { setCarrier(e.target.value); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm w-full lg:w-36"
          />
          <input
            data-testid="sp-filter-country"
            type="text"
            placeholder="Country / port"
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm w-full lg:w-36"
          />
        </div>
      </section>

      <section className="dmx-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
          <h2 className="text-sm font-semibold text-ink-900">Route Map</h2>
        </div>
        <div className="p-5">
          <ShipmentPortfolioMap
            points={data.mapPoints}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </section>

      <section className="dmx-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-ink-900">Shipments</h2>
          <span className="text-xs text-zinc-500">{data.total} total</span>
        </div>
        <div className="overflow-x-auto">
          <table data-testid="shipment-portfolio-table" className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
              <tr>
                <th className="text-left px-4 py-3">Trade</th>
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Buyer</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Carrier</th>
                <th className="text-left px-4 py-3">ETD</th>
                <th className="text-left px-4 py-3">ETA</th>
                <th className="text-left px-4 py-3">Milestone</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Health</th>
                <th className="text-left px-4 py-3">Documents</th>
                <th className="text-left px-4 py-3">Exceptions</th>
                <th className="text-left px-4 py-3">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={14} data-testid="sp-table-empty" className="px-4 py-12 text-center text-zinc-500">
                    No shipments match your filters.
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr
                    key={row.shipmentId}
                    data-testid={`sp-row-${row.shipmentId}`}
                    className={cn(
                      "border-t border-zinc-100 hover:bg-zinc-50/80 cursor-pointer",
                      selectedId === row.shipmentId && "bg-accent-50/20",
                    )}
                    onClick={() => setSelectedId(row.shipmentId)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={row.tradeWorkspaceUrl}
                        data-testid={`sp-trade-link-${row.shipmentId}`}
                        className="font-mono text-xs text-accent-900 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.tradeId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.shipmentNumber}</td>
                    <td className="px-4 py-3 text-xs">{row.buyerName}</td>
                    <td className="px-4 py-3 text-xs">{row.supplierName}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{row.origin} → {row.destination}</td>
                    <td className="px-4 py-3 text-xs">{row.carrier ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{formatDate(row.etd)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{formatDate(row.eta)}</td>
                    <td className="px-4 py-3 text-xs">{row.currentMilestone}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[row.status])}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium tabular-nums", HEALTH_STYLES[row.healthLabel])}>
                        {row.healthScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.documentsUrl ? (
                        <Link
                          to={row.documentsUrl}
                          data-testid={`sp-doc-status-${row.shipmentId}`}
                          className="text-xs text-accent-900 hover:underline"
                        >
                          {row.documentStatus}
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">{row.documentStatus}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.exceptionCount > 0 && row.primaryExceptionUrl ? (
                        <Link
                          to={row.primaryExceptionUrl}
                          data-testid={`sp-exception-${row.shipmentId}`}
                          className="inline-flex flex-col gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                            <AlertTriangle className="h-3 w-3 text-amber-700" />
                            {row.exceptionCount}
                          </span>
                          {row.highestSeverity && (
                            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium w-fit", EX_SEVERITY_STYLES[row.highestSeverity] ?? "bg-zinc-100")}>
                              {row.highestSeverity}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500">{row.exceptionStatus}</span>
                        </Link>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.openAlertCount > 0 ? (
                        <span
                          data-testid={`sp-alert-badge-${row.shipmentId}`}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-medium"
                          title={row.alerts.map((a) => a.title).join("; ")}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {row.openAlertCount}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-100">
            <button type="button" className="dmx-btn-secondary text-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="text-xs text-zinc-500 self-center">Page {page + 1} / {totalPages}</span>
            <button type="button" className="dmx-btn-secondary text-sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
