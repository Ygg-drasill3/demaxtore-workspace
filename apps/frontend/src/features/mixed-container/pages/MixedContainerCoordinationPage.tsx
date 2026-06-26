import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { MC_STATE_LABELS } from "@dmx/contracts/mixed-container.zod";
import { toast } from "@/store/toast.store";

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function MixedContainerCoordinationPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mc-coordination", id],
    queryFn: () => mixedContainerApi.coordination(id!),
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc-coordination", id] });

  if (isLoading) {
    return <div data-testid="mc-coordination-loading" className="p-8 animate-pulse">Loading…</div>;
  }
  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load container coordination.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="mc-coordination-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/mixed-container/requests" className="text-xs text-zinc-500 hover:underline">← My Containers</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Container Coordination · {data.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status: {MC_STATE_LABELS[data.state] ?? data.state} · Pay suppliers directly — DeMaxtore coordinates execution.
        </p>
      </header>

      {data.state === "MC_EXECUTION_READY" && (
        <div data-testid="mc-buyer-execution-ready" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Execution Ready</h2>
          <p className="text-sm text-green-800 mt-1">All supplier payments confirmed. Your SmartContainer is ready for order execution.</p>
          <Link to={`/buyer/mixed-container/execution/${id}`} className="inline-block mt-3 text-sm text-accent-900 underline" data-testid="mc-view-execution">View Execution Dashboard</Link>
        </div>
      )}

      {["MC_EXECUTION_ACTIVE", "MC_EXECUTION_COMPLETE"].includes(data.state) && (
        <div className="dmx-card p-5 bg-blue-50 border-blue-200">
          <h2 className="font-medium text-blue-900">Execution in progress</h2>
          <Link to={`/buyer/mixed-container/execution/${id}`} className="inline-block mt-2 text-sm text-accent-900 underline" data-testid="mc-view-execution-active">View Execution Dashboard</Link>
        </div>
      )}

      <section className="dmx-card p-5" data-testid="mc-coordination-timeline">
        <h2 className="font-medium mb-4">Mixed Container Timeline</h2>
        <ol className="space-y-3">
          {data.timeline.map((step) => (
            <li key={step.key} data-testid={`mc-timeline-${step.key}`} className="flex items-center gap-3 text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.completed ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                {step.completed ? "✓" : "·"}
              </span>
              <span className={step.completed ? "text-zinc-900 font-medium" : "text-zinc-500"}>{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="dmx-card p-5" data-testid="mc-buyer-allocations">
        <h2 className="font-medium mb-4">Allocations</h2>
        {data.allocations.length === 0 ? (
          <p className="text-sm text-zinc-500">Allocations pending — DeMaxtore operations is assigning suppliers.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Reference</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Pallets</th>
                <th className="text-left pb-2">EXW Price</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((a) => (
                <tr key={a.id} data-testid={`mc-buyer-allocation-${a.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{a.allocationRef}</td>
                  <td className="py-3">{a.productName}</td>
                  <td className="py-3">{a.allocatedPallets}</td>
                  <td className="py-3">{fmtMoney(a.expectedExwPrice)}</td>
                  <td className="py-3">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-zinc-400 mt-3">Supplier identities are not disclosed.</p>
      </section>

      {data.proformas.length > 0 && (
        <section className="dmx-card p-5" data-testid="mc-buyer-proformas">
          <h2 className="font-medium mb-4">Supplier Proformas</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Proforma #</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Due</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.proformas.map((p) => (
                <tr key={p.id} data-testid={`mc-buyer-proforma-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{p.productName}</td>
                  <td className="py-3">{p.proformaNumber}</td>
                  <td className="py-3">{fmtMoney(p.amount)} {p.currency}</td>
                  <td className="py-3">{new Date(p.dueDate).toLocaleDateString()}</td>
                  <td className="py-3">
                    <a href={p.documentUrl} target="_blank" rel="noreferrer" className="text-accent-900 underline text-xs" data-testid={`mc-proforma-doc-${p.allocationRef}`}>View</a>
                    {p.status !== "BUYER_REVIEWED" && (
                      <Button size="sm" variant="secondary" className="ml-2" data-testid={`mc-review-proforma-${p.allocationRef}`}
                        onClick={() => void mixedContainerApi.reviewProforma(id!, p.id).then(refresh).then(() => toast.success("Proforma reviewed"))}>
                        Review
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.payments.length > 0 && (
        <section className="dmx-card p-5" data-testid="mc-buyer-payments">
          <h2 className="font-medium mb-4">Payment Status</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id} data-testid={`mc-buyer-payment-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{p.productName}</td>
                  <td className="py-3">{fmtMoney(p.amount)} {p.currency}</td>
                  <td className="py-3" data-testid={`mc-buyer-payment-status-${p.allocationRef}`}>{p.paymentStatus}</td>
                  <td className="py-3">
                    {p.paymentStatus === "PENDING" && (
                      <Button size="sm" data-testid={`mc-mark-payment-sent-${p.allocationRef}`}
                        onClick={() => void mixedContainerApi.markPaymentSent(id!, p.id, `PAY-${p.allocationRef}`).then(refresh).then(() => toast.success("Payment marked sent"))}>
                        Mark Payment Sent
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
