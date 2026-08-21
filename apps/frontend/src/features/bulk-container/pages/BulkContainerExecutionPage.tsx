import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.zod";

export default function BulkContainerExecutionPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bc-execution", id],
    queryFn: () => bulkContainerApi.execution(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div data-testid="bc-execution-loading" className="p-8 animate-pulse">Loading…</div>;
  }
  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load bulk container execution.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="bc-execution-page" data-guide="bc-execution" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/bulk-container/requests" className="text-xs text-zinc-500 hover:underline">← My Bulk Requests</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">
          Bulk load · {data.masterOrderRef ?? data.containerExternalRef}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status: {BC_STATE_LABELS[data.state as keyof typeof BC_STATE_LABELS] ?? data.state} · One master order across {data.supplierOrderCount} allocation{data.supplierOrderCount === 1 ? "" : "s"}.
        </p>
      </header>

      <div className="dmx-card p-5" data-testid="bc-execution-progress">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-medium">Overall Completion</h2>
          <span className="text-2xl font-display font-semibold" data-testid="bc-completion-percent">{data.completionPercent}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-accent-900 rounded-full transition-all" style={{ width: `${data.completionPercent}%` }} />
        </div>
      </div>

      {data.state === "BC_EXECUTION_COMPLETE" && (
        <div data-testid="bc-execution-complete-banner" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Execution Complete</h2>
          <p className="text-sm text-green-800 mt-1">All linked shipments have been delivered. This bulk load is complete.</p>
        </div>
      )}

      <section className="dmx-card p-5" data-testid="bc-execution-timeline">
        <h2 className="font-medium mb-4">Execution Timeline</h2>
        <ol className="space-y-3">
          {data.timeline.map((step) => (
            <li key={step.key} data-testid={`bc-exec-timeline-${step.key}`} className="flex items-center gap-3 text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.completed ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                {step.completed ? "✓" : "·"}
              </span>
              <span className={step.completed ? "text-zinc-900 font-medium" : "text-zinc-500"}>{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="dmx-card p-5 overflow-x-auto" data-testid="bc-execution-allocations">
        <h2 className="font-medium mb-4">Allocation Execution Progress</h2>
        {data.allocations.length === 0 ? (
          <p className="text-sm text-zinc-500">Orders not yet spawned — awaiting execution bridge.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Order</th>
                <th className="text-left pb-2">Freight</th>
                <th className="text-left pb-2">Shipment</th>
                <th className="text-left pb-2">Docs</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((a) => (
                <tr key={a.allocationRef} data-testid={`bc-exec-allocation-${a.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{a.allocationRef}</td>
                  <td className="py-3">{a.productName}</td>
                  <td className="py-3" data-testid={`bc-exec-order-${a.allocationRef}`}>{a.orderState ?? "—"}</td>
                  <td className="py-3" data-testid={`bc-exec-freight-${a.allocationRef}`}>{a.freightStatus ?? "—"}</td>
                  <td className="py-3" data-testid={`bc-exec-shipment-${a.allocationRef}`}>{a.shipmentState ?? "—"}</td>
                  <td className="py-3">{a.documentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-zinc-400 mt-3">Supplier identities are not disclosed. Execution uses standard order, freight, and shipment steps.</p>
      </section>

      {data.documents.length > 0 && (
        <section className="dmx-card p-5" data-testid="bc-execution-documents">
          <h2 className="font-medium mb-4">Document Hub</h2>
          <ul className="space-y-2 text-sm">
            {data.documents.map((d) => (
              <li key={d.id} data-testid={`bc-exec-doc-${d.type}-${d.id.slice(0, 8)}`} className="flex justify-between border-b border-zinc-50 pb-2">
                <span>{d.label} <span className="text-zinc-400 text-xs">({d.source})</span></span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-accent-900 underline text-xs">View</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
