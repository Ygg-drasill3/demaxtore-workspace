import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useControlTowerOpsDashboard,
  useControlTowerAlerts,
  useSupplierPerformance,
  useBuyerPerformance,
  useShipmentTrackingOps,
  useResolveAlert,
  useControlTowerRealtime,
} from "../hooks";
import { toast } from "@/store/toast.store";
import PoOverviewWidget from "@/features/purchase-order/components/PoOverviewWidget";
import { LazyMount } from "@/components/ui/LazyMount";

function workspacePath(type: string | null, id: string | null): string | null {
  if (!id || !type) return null;
  const map: Record<string, string> = {
    RFQ: "rfq",
    COMMODITYBID: "commoditybid",
    ORDER: "order",
    SHIPMENT: "shipment",
  };
  const seg = map[type];
  return seg ? `/workspace/${seg}/${id}` : null;
}

export default function OperationsPage() {
  useControlTowerRealtime();
  const { data: dashboard, isLoading, isError, refetch } = useControlTowerOpsDashboard();
  const { data: alerts } = useControlTowerAlerts("false");
  const resolve = useResolveAlert();

  const critical = (alerts?.items ?? []).filter((a) => a.severity === "CRITICAL");
  const open = alerts?.items ?? [];

  const handleResolve = async (id: string) => {
    try {
      await resolve.mutateAsync(id);
      toast.success("Alert resolved");
    } catch {
      toast.error("Failed to resolve alert");
    }
  };

  if (isLoading) {
    return <div data-testid="operations-loading" className="p-8 text-sm text-zinc-500">Loading control tower…</div>;
  }

  if (isError || !dashboard) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load operations dashboard.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const overview = dashboard.overview;
  const sla = dashboard.sla;
  const freightCommercial = dashboard.freightCommercial;

  return (
    <div data-testid="operations-page" data-guide="operations-control-tower" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow">Admin · Operations</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Control Tower</h1>
        <p className="text-sm text-zinc-500 mt-2">Read-only visibility across RFQ, CommodityBid, Order, and Shipment pipelines.</p>
        {overview?.excludesTestData && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3" data-testid="ct-test-data-notice">
            Development mode: E2E and test workspaces are excluded from counts; stale test alerts are auto-resolved on refresh.
          </p>
        )}
      </header>

      <PoOverviewWidget />

      {freightCommercial && (
        <section data-testid="operations-freightiq-metrics" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Freight volume" value={freightCommercial.freightVolume} testId="ct-freight-volume" />
          <Kpi label="Selected offers" value={freightCommercial.selectedFreightOffers} testId="ct-freight-selected" />
          <Kpi label="Revenue pending" value={freightCommercial.revenuePendingUsd} testId="ct-freight-revenue-pending" />
          <Kpi label="Revenue realized" value={freightCommercial.revenueRealizedUsd} testId="ct-freight-revenue-realized" />
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="operations-kpis">
        <Kpi label="Open alerts" value={overview?.openAlerts ?? 0} testId="kpi-open-alerts" />
        <Kpi label="Critical" value={overview?.criticalAlerts ?? 0} testId="kpi-critical" danger />
        <Kpi label="Warning" value={overview?.warningAlerts ?? 0} testId="kpi-warning" />
        <Kpi label="Overdue items" value={overview?.overdueItems ?? 0} testId="kpi-overdue" />
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Pipeline funnels</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(overview?.widgets ?? []).map((w) => (
            <div key={w.id} className="dmx-card p-4" data-testid={`funnel-${w.id}`}>
              <h3 className="text-sm font-medium">{w.title}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {w.metrics?.map((m) => (
                  <div key={m.key} className="text-xs">
                    <span className="text-zinc-500">{m.label}</span>
                    <div className="text-lg font-semibold tabular-nums">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Critical alerts</h2>
          <AlertTable
            testId="critical-alerts"
            rows={critical}
            onResolve={handleResolve}
            resolving={resolve.isPending}
          />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Open alerts</h2>
          <AlertTable
            testId="open-alerts"
            rows={open}
            onResolve={handleResolve}
            resolving={resolve.isPending}
          />
        </div>
      </section>

      <section data-testid="sla-dashboard" data-guide="operations-sla">
        <h2 className="font-display text-lg font-semibold mb-3">SLA overview</h2>
        <div className="dmx-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Avg time</th>
                <th className="px-4 py-3">Samples</th>
              </tr>
            </thead>
            <tbody>
              {(sla ?? []).map((row) => (
                <tr key={row.key} data-testid={`sla-row-${row.key}`} className="border-t border-zinc-100">
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3 tabular-nums">{row.averageHoursDisplay}</td>
                  <td className="px-4 py-3 tabular-nums">{row.sampleSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LazyMount rootMargin="2400px">
        <OperationsTrackingSection />
      </LazyMount>

      <LazyMount rootMargin="2400px">
        <OperationsSupplierSection />
      </LazyMount>

      <LazyMount rootMargin="2400px">
        <OperationsBuyerSection />
      </LazyMount>
    </div>
  );
}

function OperationsTrackingSection() {
  const { data: trackingOps } = useShipmentTrackingOps();
  return (
      <section data-testid="operations-shipment-tracking" className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Shipment tracking (maritime)</h2>
        <OpsTrackingTable title="Delayed shipments" testId="ops-delayed" rows={trackingOps?.delayed ?? []} />
        <OpsTrackingTable title="ETA drift" testId="ops-eta-drift" rows={trackingOps?.etaDrift ?? []} />
        <OpsTrackingTable title="Tracking failures" testId="ops-tracking-failures" rows={trackingOps?.trackingFailures ?? []} />
        <OpsTrackingTable title="Recently arrived" testId="ops-recently-arrived" rows={trackingOps?.recentlyArrived ?? []} />
      </section>
  );
}

function OperationsSupplierSection() {
  const { data: suppliers } = useSupplierPerformance();
  return (
      <section data-testid="supplier-performance">
        <h2 className="font-display text-lg font-semibold mb-3">Supplier performance</h2>
        <PerfTable
          headers={["Supplier", "Invited", "Responded", "Won", "Declined", "Response %", "Award %"]}
          rows={(suppliers ?? []).map((s) => [
            s.displayName,
            s.invited,
            s.responded,
            s.won,
            s.declined,
            s.responseRate != null ? `${Math.round(s.responseRate * 100)}%` : "—",
            s.awardRate != null ? `${Math.round(s.awardRate * 100)}%` : "—",
          ])}
          testIdPrefix="supplier-row"
        />
      </section>
  );
}

function OperationsBuyerSection() {
  const { data: buyers } = useBuyerPerformance();
  return (
      <section data-testid="buyer-performance">
        <h2 className="font-display text-lg font-semibold mb-3">Buyer activity</h2>
        <PerfTable
          headers={["Buyer", "RFQs created", "RFQs completed", "Orders", "Shipments done"]}
          rows={(buyers ?? []).map((b) => [
            b.displayName,
            b.rfqCreated,
            b.rfqCompleted,
            b.ordersCreated,
            b.shipmentsCompleted,
          ])}
          testIdPrefix="buyer-row"
        />
      </section>
  );
}

function Kpi({ label, value, testId, danger }: { label: string; value: number; testId: string; danger?: boolean }) {
  return (
    <div className="dmx-card p-4" data-testid={testId}>
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-3xl font-semibold tabular-nums mt-1 ${danger && value > 0 ? "text-red-700" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function AlertTable({
  testId,
  rows,
  onResolve,
  resolving,
}: {
  testId: string;
  rows: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    workspaceRef: string | null;
    workspaceType: string | null;
    workspaceId: string | null;
    createdAt: string;
  }>;
  onResolve: (id: string) => void;
  resolving: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        testId={`${testId}-empty`}
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        title="All clear — no open alerts"
        body="Operations monitoring is active. New shipment, payment, and SLA exceptions will surface here for triage."
      />
    );
  }
  return (
    <div className="dmx-card overflow-hidden" data-testid={testId}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Ref</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const href = workspacePath(a.workspaceType, a.workspaceId);
            return (
              <tr key={a.id} data-testid={`alert-row-${a.id}`} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium ${a.severity === "CRITICAL" ? "text-red-700" : "text-amber-700"}`}>
                    {a.severity}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-1">{a.description}</div>
                </td>
                <td className="px-3 py-2">
                  {href ? (
                    <Link to={href} className="text-blue-800 hover:underline">{a.workspaceRef}</Link>
                  ) : (
                    a.workspaceRef ?? "—"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    data-testid={`resolve-alert-${a.id}`}
                    disabled={resolving}
                    onClick={() => onResolve(a.id)}
                    className="text-xs px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OpsTrackingTable({
  title,
  testId,
  rows,
}: {
  title: string;
  testId: string;
  rows: Array<{ shipmentId: string; externalRef: string; vesselName: string | null; trackingStatus: string | null; eta: string | null }>;
}) {
  return (
    <div className="dmx-card p-4" data-testid={testId}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">None</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1">Ref</th>
              <th>Vessel</th>
              <th>Status</th>
              <th>ETA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.shipmentId} className="border-t border-zinc-100">
                <td className="py-1">
                  <Link to={`/workspace/shipment/${r.shipmentId}`} className="text-blue-800">{r.externalRef}</Link>
                </td>
                <td>{r.vesselName ?? "—"}</td>
                <td>{r.trackingStatus ?? "—"}</td>
                <td>{r.eta ? new Date(r.eta).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PerfTable({
  headers,
  rows,
  testIdPrefix,
}: {
  headers: string[];
  rows: (string | number)[][];
  testIdPrefix: string;
}) {
  return (
    <div className="dmx-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
          <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-4 py-6 text-zinc-500">No data yet.</td></tr>
          ) : rows.map((cells, i) => (
            <tr key={i} data-testid={`${testIdPrefix}-${i}`} className="border-t border-zinc-100">
              {cells.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
