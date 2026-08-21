import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.zod";
import type { BcCoordinationDTO } from "@dmx/contracts/bulk-container.zod";
import { ContainerCommunicationPanel } from "@/features/unified-messages/components/ContainerCommunicationPanel";

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function progressLabel(alloc: BcCoordinationDTO["allocations"][0]): string[] {
  const lines: string[] = [];
  if (alloc.proformaReceived) lines.push("Proforma Received");
  else lines.push("Proforma Pending");
  if (alloc.paymentStatus === "PAYMENT_CONFIRMED") lines.push("Payment Confirmed");
  else if (alloc.paymentStatus === "PAYMENT_PENDING") lines.push("Payment Pending");
  else if (alloc.paymentStatus === "PAYMENT_REJECTED") lines.push("Payment Rejected");
  return lines;
}

export default function BulkContainerCoordinationPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bc-coordination", id],
    queryFn: () => bulkContainerApi.coordination(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div data-testid="bc-coordination-loading" className="p-8 animate-pulse">Loading…</div>;
  }
  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load bulk container coordination.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="bc-coordination-page" data-guide="bc-coordination" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/bulk-container/requests" className="text-xs text-zinc-500 hover:underline">← My Bulk Requests</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Coordination · {data.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status: {BC_STATE_LABELS[data.state as keyof typeof BC_STATE_LABELS] ?? data.state} · Pay suppliers directly.
        </p>
      </header>

      {data.executionReady && (
        <div data-testid="bc-buyer-execution-ready" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Execution Ready</h2>
          <p className="text-sm text-green-800 mt-1">All supplier payments confirmed. Your bulk load is ready for execution.</p>
          <Link to={`/buyer/bulk-container/execution/${id}`} className="inline-block mt-3 text-sm text-accent-900 underline" data-testid="bc-view-execution">View Execution Dashboard</Link>
        </div>
      )}

      <section className="dmx-card p-5" data-testid="bc-coordination-timeline">
        <h2 className="font-medium mb-4">Bulk Container Timeline</h2>
        <ol className="space-y-3">
          {data.timeline.map((step) => (
            <li key={step.key} data-testid={`bc-timeline-${step.key}`} className="flex items-center gap-3 text-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.completed ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                {step.completed ? "✓" : "·"}
              </span>
              <span className={step.completed ? "text-zinc-900 font-medium" : "text-zinc-500"}>{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="dmx-card p-5" data-testid="bc-payment-progress">
        <h2 className="font-medium mb-4">Payment Progress</h2>
        {data.allocations.length === 0 ? (
          <p className="text-sm text-zinc-500">Allocations pending — DeMaxtore operations is assigning suppliers.</p>
        ) : (
          <div className="space-y-4">
            {data.allocations.map((a) => (
              <div key={a.id} data-testid={`bc-progress-${a.allocationRef}`} className="border border-zinc-100 rounded-lg p-4">
                <p className="font-medium">{a.allocationRef}</p>
                <p className="text-sm text-zinc-600 mt-1">{a.productName} · {a.allocatedQuantityMt} MT</p>
                <ul className="mt-2 text-sm text-zinc-500 space-y-1">
                  {progressLabel(a).map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dmx-card p-5" data-testid="bc-buyer-allocations">
        <h2 className="font-medium mb-4">Allocations</h2>
        {data.allocations.length === 0 ? (
          <p className="text-sm text-zinc-500">Pending supplier assignment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Reference</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Packing</th>
                <th className="text-left pb-2">MT</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((a) => (
                <tr key={a.id} data-testid={`bc-buyer-allocation-${a.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{a.allocationRef}</td>
                  <td className="py-3">{a.productName}</td>
                  <td className="py-3">{a.packingType}</td>
                  <td className="py-3">{a.allocatedQuantityMt}</td>
                  <td className="py-3">{a.allocationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-zinc-400 mt-3">Supplier identities are not disclosed.</p>
      </section>

      {data.proformas.length > 0 && (
        <section className="dmx-card p-5" data-testid="bc-buyer-proformas">
          <h2 className="font-medium mb-4">Supplier Proformas</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Proforma #</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Download</th>
              </tr>
            </thead>
            <tbody>
              {data.proformas.map((p) => (
                <tr key={p.id} data-testid={`bc-buyer-proforma-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{p.productName}</td>
                  <td className="py-3">{p.proformaNumber}</td>
                  <td className="py-3">{fmtMoney(p.amount)} {p.currency}</td>
                  <td className="py-3">
                    <a href={p.proformaFileUrl} target="_blank" rel="noreferrer" className="text-accent-900 underline text-xs" data-testid={`bc-proforma-doc-${p.allocationRef}`}>Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.payments.length > 0 && (
        <section className="dmx-card p-5" data-testid="bc-buyer-payments">
          <h2 className="font-medium mb-4">Payment Status</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id} data-testid={`bc-buyer-payment-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{p.productName}</td>
                  <td className="py-3">{fmtMoney(p.amount)} {p.currency}</td>
                  <td className="py-3" data-testid={`bc-buyer-payment-status-${p.allocationRef}`}>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {id && (
        <ContainerCommunicationPanel
          contextType="BULK_CONTAINER"
          contextId={id}
          testId="bulk-container-communication"
        />
      )}
    </div>
  );
}
