import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, Zap } from "lucide-react";
import type { ExceptionHubQuery, ExceptionSeverity, ExceptionStatus, ExceptionType } from "@dmx/contracts/exception-hub";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { cn } from "@/lib/utils";
import { exceptionHubApi } from "../lib/exception-hub.api";

const SEVERITIES: ExceptionSeverity[] = ["Critical", "High", "Medium", "Low"];
const STATUSES: ExceptionStatus[] = [
  "Open", "In Progress", "Waiting For Buyer", "Waiting For Supplier", "Waiting For Operations", "Resolved", "Closed",
];
const TYPES: ExceptionType[] = [
  "Shipment Delay", "ETA Change", "Production Delay", "Missing Document", "Document Rejected",
  "Document Revision Requested", "Customs Issue", "Container Roll-over", "Carrier Update",
  "Payment Pending", "PO Pending", "Inspection Issue", "Contract Issue", "Manual Exception",
];

const SEVERITY_STYLES: Record<ExceptionSeverity, string> = {
  Critical: "bg-red-100 text-red-900 border-red-200",
  High: "bg-orange-100 text-orange-900 border-orange-200",
  Medium: "bg-amber-100 text-amber-900 border-amber-200",
  Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Kpi({ label, value, testId, accent }: { label: string; value: React.ReactNode; testId: string; accent?: string }) {
  return (
    <div data-testid={testId} className={cn("rounded-xl border border-zinc-200 bg-white px-4 py-3", accent)}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

export default function ExceptionHubPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<ExceptionSeverity | "">("");
  const [status, setStatus] = useState<ExceptionStatus | "">("");
  const [exceptionType, setExceptionType] = useState<ExceptionType | "">("");
  const [waitingForMe, setWaitingForMe] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 25;

  const params = useMemo((): Partial<ExceptionHubQuery> => ({
    limit,
    offset: page * limit,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(severity ? { severity } : {}),
    ...(status ? { status } : {}),
    ...(exceptionType ? { exceptionType } : {}),
    ...(waitingForMe ? { waitingForMe: true } : {}),
  }), [search, severity, status, exceptionType, waitingForMe, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["exception-hub", params],
    queryFn: () => exceptionHubApi.list(params),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div data-testid="exception-hub-error" className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-red-600">Could not load exception hub.</p>
        <button type="button" className="dmx-btn-secondary mt-3" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const actionItems = data.items.filter((r) =>
    ["Waiting For Buyer", "Open", "In Progress"].includes(r.status) && r.requiredAction,
  );
  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <div data-testid="exception-hub" className="max-w-[1600px] mx-auto space-y-6 pb-10 animate-fade-in">
      <header className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-ink-950 via-[#1a1028] to-ink-800 text-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-500/20 grid place-items-center">
            <AlertTriangle className="h-6 w-6 text-red-300" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">Alert Hub</div>
            <h1 className="font-display text-3xl font-semibold mt-1">Alert</h1>
            <p className="text-sm text-white/60 mt-2 max-w-xl">
              What needs attention, what is delayed, what is missing, and what action is required.
            </p>
          </div>
        </div>
      </header>

      <section data-testid="eh-kpis" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi testId="eh-kpi-open" label="Open Alerts" value={data.kpis.openExceptions} />
        <Kpi testId="eh-kpi-critical" label="Critical" value={data.kpis.criticalExceptions} accent="border-red-200 bg-red-50/30" />
        <Kpi testId="eh-kpi-pending" label="My Pending Actions" value={data.kpis.myPendingActions} />
        <Kpi testId="eh-kpi-resolved" label="Resolved This Week" value={data.kpis.resolvedThisWeek} />
        <Kpi
          testId="eh-kpi-avg-resolution"
          label="Avg Resolution (hrs)"
          value={data.kpis.averageResolutionHours ?? "—"}
        />
        <Kpi testId="eh-kpi-types" label="Exception Types" value={data.kpis.exceptionsByType.length} />
      </section>

      {actionItems.length > 0 && (
        <section data-testid="eh-action-center" className="dmx-card overflow-hidden border-amber-200">
          <div className="border-b border-amber-100 px-5 py-3 bg-amber-50/80 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-semibold text-amber-900">Action Required</h2>
          </div>
          <ul className="divide-y divide-amber-50">
            {actionItems.slice(0, 5).map((item) => (
              <li key={item.id} data-testid={`eh-action-${item.id}`} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{item.requiredAction}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {item.exceptionRef} · {item.exceptionType} · {item.tradeId}
                  </div>
                </div>
                <Link to={item.detailUrl} className="text-xs font-medium text-accent-900 hover:underline shrink-0">
                  Take action →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section data-testid="eh-analytics" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="dmx-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Exception Rate</div>
          <div className="font-display text-xl font-semibold mt-1">{data.analytics.exceptionRate ?? "—"}%</div>
        </div>
        <div className="dmx-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">By Supplier (top)</div>
          <ul className="mt-2 space-y-1 text-xs">
            {data.analytics.bySupplier.slice(0, 3).map((s) => (
              <li key={s.name} className="flex justify-between"><span>{s.name}</span><span className="tabular-nums">{s.count}</span></li>
            ))}
            {data.analytics.bySupplier.length === 0 && <li className="text-zinc-400">None</li>}
          </ul>
        </div>
        <div className="dmx-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">By Carrier (top)</div>
          <ul className="mt-2 space-y-1 text-xs">
            {data.analytics.byCarrier.slice(0, 3).map((s) => (
              <li key={s.name} className="flex justify-between"><span>{s.name}</span><span className="tabular-nums">{s.count}</span></li>
            ))}
            {data.analytics.byCarrier.length === 0 && <li className="text-zinc-400">None</li>}
          </ul>
        </div>
        <div className="dmx-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">By Type</div>
          <ul className="mt-2 space-y-1 text-xs max-h-24 overflow-y-auto">
            {data.kpis.exceptionsByType.slice(0, 5).map((t) => (
              <li key={t.type} className="flex justify-between"><span className="truncate pr-2">{t.type}</span><span className="tabular-nums">{t.count}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section data-testid="eh-filters" className="dmx-card p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="eh-search"
              type="search"
              placeholder="Search trade ID, exception ID, shipment, supplier…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-zinc-200 cursor-pointer">
            <input
              data-testid="eh-filter-waiting-for-me"
              type="checkbox"
              checked={waitingForMe}
              onChange={(e) => { setWaitingForMe(e.target.checked); setPage(0); }}
            />
            Waiting for me
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            data-testid="eh-filter-severity"
            value={severity}
            onChange={(e) => { setSeverity(e.target.value as ExceptionSeverity | ""); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            data-testid="eh-filter-status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as ExceptionStatus | ""); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            data-testid="eh-filter-type"
            value={exceptionType}
            onChange={(e) => { setExceptionType(e.target.value as ExceptionType | ""); setPage(0); }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </section>

      <section className="dmx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="eh-table" className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
              <tr>
                <th className="text-left px-4 py-3">Exception ID</th>
                <th className="text-left px-4 py-3">Trade ID</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Buyer</th>
                <th className="text-left px-4 py-3">Manufacturer</th>
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={11} data-testid="eh-empty" className="px-4 py-12 text-center text-zinc-500">
                    No exceptions match your filters.
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id} data-testid={`eh-row-${row.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <Link to={row.detailUrl} className="font-mono text-xs text-accent-900 hover:underline">
                        {row.exceptionRef}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={row.tradeWorkspaceUrl} className="font-mono text-xs hover:underline">{row.tradeId}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.exceptionType}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", SEVERITY_STYLES[row.severity])}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{row.supplierName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.shipmentRef ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{row.ownerName ?? row.ownerRole ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{row.status}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
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
