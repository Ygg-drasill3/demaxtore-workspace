import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AnalyticsTimePreset } from "@dmx/contracts/operational-analytics";
import { analyticsApi, type AnalyticsFilterParams } from "@/features/operational-analytics/lib/analytics.api";

const PRESETS: { value: AnalyticsTimePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "CUSTOM", label: "Custom" },
];

function fmt(n: number | null | undefined, suffix = "") {
  if (n == null) return "—";
  return `${n}${suffix}`;
}

export function OperationalAnalyticsDashboard() {
  const [preset, setPreset] = useState<AnalyticsTimePreset>("LAST_30_DAYS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const params: AnalyticsFilterParams = useMemo(() => {
    if (preset === "CUSTOM") {
      return {
        preset,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      };
    }
    return { preset };
  }, [preset, from, to]);

  const enabled = preset !== "CUSTOM" || (!!from && !!to);

  const summaryQ = useQuery({
    queryKey: ["analytics", "summary", params],
    queryFn: () => analyticsApi.summary(params),
    enabled,
  });

  const suppliersEnabled = !!summaryQ.data?.permissions.canViewSuppliers;
  const suppliersQ = useQuery({
    queryKey: ["analytics", "suppliers", params],
    queryFn: () => analyticsApi.suppliers(params),
    enabled: enabled && suppliersEnabled,
  });

  async function doExport(format: "csv" | "xlsx", scope: "summary" | "suppliers" = "summary") {
    setExporting(true);
    try {
      await analyticsApi.downloadExport({ ...params, format, scope });
    } finally {
      setExporting(false);
    }
  }

  const data = summaryQ.data;

  return (
    <section
      className="dmx-card p-4 space-y-5"
      data-testid="ops-analytics-dashboard"
      aria-label="Operational analytics"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Operational Analytics</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Read-only KPIs from Orders, Shipments, Inspections, Tasks, Issues &amp; Completion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center" data-testid="ops-analytics-filters">
          <label className="text-xs text-zinc-500">
            Range
            <select
              className="ml-2 rounded border px-2 py-1.5 text-sm"
              value={preset}
              onChange={(e) => setPreset(e.target.value as AnalyticsTimePreset)}
              aria-label="Analytics time range"
              data-testid="ops-analytics-preset"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          {preset === "CUSTOM" && (
            <>
              <input
                type="date"
                className="rounded border px-2 py-1.5 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Custom from date"
                data-testid="ops-analytics-from"
              />
              <input
                type="date"
                className="rounded border px-2 py-1.5 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Custom to date"
                data-testid="ops-analytics-to"
              />
            </>
          )}
          {data?.permissions.canExport && (
            <div className="flex gap-1">
              <button
                type="button"
                className="dmx-btn-secondary text-xs"
                disabled={exporting || !enabled}
                onClick={() => void doExport("csv")}
                data-testid="ops-analytics-export-csv"
              >
                Export CSV
              </button>
              <button
                type="button"
                className="dmx-btn-secondary text-xs"
                disabled={exporting || !enabled}
                onClick={() => void doExport("xlsx")}
                data-testid="ops-analytics-export-xlsx"
              >
                Export XLSX
              </button>
            </div>
          )}
        </div>
      </div>

      {summaryQ.isLoading ? (
        <p className="text-sm text-zinc-500">Loading KPIs…</p>
      ) : summaryQ.isError ? (
        <button type="button" className="text-sm text-red-600 underline" onClick={() => void summaryQ.refetch()}>
          Retry
        </button>
      ) : data ? (
        <>
          <Section title="Overview" testId="ops-analytics-overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Open orders" value={data.orders.openOrders} />
              <Stat label="Completed orders" value={data.orders.completedOrders} />
              <Stat label="Avg completion (h)" value={fmt(data.orders.averageCompletionHours)} />
              <Stat label="Completion rate %" value={fmt(data.completion.completionRatePct)} />
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Shipments" testId="ops-analytics-shipments">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Active" value={data.shipments.activeShipments} />
                <Stat label="Delayed" value={data.shipments.delayedShipments} />
                <Stat label="On-time %" value={fmt(data.shipments.onTimeDeliveryPct)} />
                <Stat label="Avg delay (h)" value={fmt(data.shipments.averageDelayHours)} />
              </div>
              <MiniBars
                label="Shipment delay vs active"
                items={[
                  { label: "Active", value: data.shipments.activeShipments },
                  { label: "Delayed", value: data.shipments.delayedShipments },
                ]}
              />
            </Section>

            <Section title="Inspections" testId="ops-analytics-inspections">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Requested" value={data.inspections.requested} />
                <Stat label="Passed" value={data.inspections.passed} />
                <Stat label="Failed" value={data.inspections.failed} />
                <Stat label="Pass rate %" value={fmt(data.inspections.passRatePct)} />
              </div>
              <MiniBars
                label="Inspection outcomes"
                items={[
                  { label: "Passed", value: data.inspections.passed },
                  { label: "Failed", value: data.inspections.failed },
                ]}
              />
            </Section>

            <Section title="Tasks" testId="ops-analytics-tasks">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Open" value={data.tasks.open} />
                <Stat label="Overdue" value={data.tasks.overdue} />
                <Stat label="Completed today" value={data.tasks.completedToday} />
                <Stat label="Avg resolution (h)" value={fmt(data.tasks.averageResolutionHours)} />
              </div>
            </Section>

            <Section title="Issues" testId="ops-analytics-issues">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Open" value={data.issues.open} />
                <Stat label="Critical" value={data.issues.critical} />
                <Stat label="Resolved today" value={data.issues.resolvedToday} />
                <Stat label="Avg resolution (h)" value={fmt(data.issues.averageResolutionHours)} />
              </div>
            </Section>
          </div>

          <Section title="Completion" testId="ops-analytics-completion">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat label="Ready" value={data.completion.ready} />
              <Stat label="Completed today" value={data.completion.completedToday} />
              <Stat label="Completion rate %" value={fmt(data.completion.completionRatePct)} />
            </div>
          </Section>

          <Section title="Recent Trends" testId="ops-analytics-trends">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {data.trends.map((t) => (
                <li key={t.key} className="rounded-lg border border-paper-100 p-2">
                  <div className="text-[11px] text-zinc-500">{t.label}</div>
                  <div className="text-lg font-semibold tabular-nums">{t.value}</div>
                  <div className="text-[11px] text-zinc-500">
                    {t.deltaPct == null ? "vs prior —" : `vs prior ${t.deltaPct > 0 ? "+" : ""}${t.deltaPct}%`}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {suppliersEnabled && (
            <Section title="Supplier KPIs" testId="ops-analytics-suppliers">
              {suppliersQ.isLoading ? (
                <p className="text-sm text-zinc-500">Loading suppliers…</p>
              ) : suppliersQ.isError ? (
                <button type="button" className="text-sm text-red-600 underline" onClick={() => void suppliersQ.refetch()}>
                  Retry
                </button>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Supplier KPI table">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500 border-b">
                        <th className="py-2 pr-2">Supplier</th>
                        <th className="py-2 pr-2">Open</th>
                        <th className="py-2 pr-2">Completed</th>
                        <th className="py-2 pr-2">Insp %</th>
                        <th className="py-2 pr-2">Delay %</th>
                        <th className="py-2 pr-2">Lead (d)</th>
                        <th className="py-2">Completion (h)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(suppliersQ.data?.items ?? []).slice(0, 15).map((row) => (
                        <tr key={row.supplierUserId} className="border-b border-zinc-50">
                          <td className="py-2 pr-2 font-medium">{row.supplierName}</td>
                          <td className="py-2 pr-2 tabular-nums">{row.openOrders}</td>
                          <td className="py-2 pr-2 tabular-nums">{row.completedOrders}</td>
                          <td className="py-2 pr-2 tabular-nums">{fmt(row.inspectionPassPct)}</td>
                          <td className="py-2 pr-2 tabular-nums">{fmt(row.shipmentDelayPct)}</td>
                          <td className="py-2 pr-2 tabular-nums">{fmt(row.averageLeadTimeDays)}</td>
                          <td className="py-2 tabular-nums">{fmt(row.averageCompletionHours)}</td>
                        </tr>
                      ))}
                      {(suppliersQ.data?.items.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={7} className="py-3 text-zinc-500">No supplier activity in range</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {data.permissions.canExport && (
                <button
                  type="button"
                  className="text-xs underline mt-2"
                  disabled={exporting || !enabled}
                  onClick={() => void doExport("csv", "suppliers")}
                  data-testid="ops-analytics-export-suppliers"
                >
                  Export supplier CSV
                </button>
              )}
            </Section>
          )}
        </>
      ) : null}
    </section>
  );
}

function Section({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div data-testid={testId} className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-paper-100 p-2 text-center sm:text-left">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MiniBars({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div
      className="mt-2 space-y-1"
      role="img"
      aria-label={`${label}: ${items.map((i) => `${i.label} ${i.value}`).join(", ")}`}
    >
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <span className="w-16 text-zinc-500 shrink-0">{i.label}</span>
          <div className="flex-1 h-2 rounded bg-zinc-100 overflow-hidden">
            <div
              className="h-full bg-zinc-700 rounded"
              style={{ width: `${Math.round((i.value / max) * 100)}%` }}
            />
          </div>
          <span className="tabular-nums w-8 text-right">{i.value}</span>
        </div>
      ))}
    </div>
  );
}
