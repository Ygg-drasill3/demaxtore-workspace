import {
  MC_PROGRESS_STEPS,
  PROCUREMENT_STATUS_LABELS,
  isProgressStepComplete,
  type ProcurementRequestDetailDTO,
  type ProcurementRequestStatus,
} from "@dmx/contracts/mixed-container-procurement";

type Props = {
  detail: ProcurementRequestDetailDTO;
  showInternalNotes?: boolean;
  children?: React.ReactNode;
};

export function ProcurementRequestDetailView({ detail, showInternalNotes = false, children }: Props) {
  const current = detail.procurementStatus as ProcurementRequestStatus;
  const ref = detail.procurementRequestRef ?? detail.externalRef;

  return (
    <div data-testid="mc-procurement-request-detail" className="space-y-6">
      <header className="dmx-card p-5" data-testid="mc-pr-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Procurement Request</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1" data-testid="mc-pr-ref">{ref}</h1>
            <p className="text-sm text-zinc-600 mt-2">
              {detail.buyerName}
              {detail.buyerOrgName ? ` · ${detail.buyerOrgName}` : ""}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-accent-50 text-accent-900 border border-accent-100" data-testid="mc-pr-status">
              {PROCUREMENT_STATUS_LABELS[current]}
            </span>
            {detail.submissionDate && (
              <p className="text-xs text-zinc-500 mt-2">Submitted {new Date(detail.submissionDate).toLocaleString()}</p>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Destination port</dt>
            <dd className="font-medium mt-1">{detail.destinationPort ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Products</dt>
            <dd className="font-medium mt-1">{detail.productCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Total pallets</dt>
            <dd className="font-medium mt-1">{detail.totalPallets}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Procurement manager</dt>
            <dd className="font-medium mt-1" data-testid="mc-pr-manager">{detail.assignedManagerName ?? "Unassigned"}</dd>
          </div>
        </dl>
        {detail.buyerNotes && (
          <p className="text-sm text-zinc-600 mt-4 border-t border-zinc-100 pt-4">Buyer notes: {detail.buyerNotes}</p>
        )}
      </header>

      {children}

      <section className="dmx-card p-5" data-testid="mc-pr-progress">
        <h2 className="font-medium mb-4">Progress</h2>
        <ol className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0">
          {MC_PROGRESS_STEPS.map((step, idx) => {
            const done = isProgressStepComplete(step.key, current);
            const active = current === step.key || (step.key === "BUYER_REVIEW" && current === "REVISION_REQUESTED");
            return (
              <li key={step.key} className="flex md:flex-1 items-center gap-2">
                <span
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    done ? "bg-green-600 text-white" : active ? "bg-accent-900 text-white" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className={`text-sm ${done || active ? "text-zinc-900 font-medium" : "text-zinc-500"}`}>{step.label}</span>
                {idx < MC_PROGRESS_STEPS.length - 1 && <span className="hidden md:block flex-1 h-px bg-zinc-200 mx-2" />}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="dmx-card p-5" data-testid="mc-pr-container-summary">
        <h2 className="font-medium mb-3">SmartContainer Summary</h2>
        <p className="text-sm text-zinc-600 mb-4">
          {detail.containerType.replace("CONTAINER_", "").replace("_", " ")} · {detail.fillPercent}% capacity
        </p>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Packaging</th>
              <th className="text-left pb-2">Pallets</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id} className="border-t border-zinc-100">
                <td className="py-2">
                  <div className="font-medium">{line.name}</div>
                  <div className="text-xs text-zinc-500">{line.category}</div>
                </td>
                <td className="py-2">{line.packaging}</td>
                <td className="py-2">{line.palletCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="dmx-card p-5" data-testid="mc-pr-activity">
        <h2 className="font-medium mb-3">Activity Timeline</h2>
        {detail.activityTimeline.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {detail.activityTimeline.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm border-l-2 border-zinc-100 pl-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showInternalNotes && detail.internalNotes && detail.internalNotes.length > 0 && (
        <section className="dmx-card p-5" data-testid="mc-pr-internal-notes">
          <h2 className="font-medium mb-3">Internal Notes</h2>
          <ul className="space-y-3">
            {detail.internalNotes.map((note) => (
              <li key={note.id} className="text-sm border-t border-zinc-100 pt-3 first:border-0 first:pt-0">
                <p className="text-zinc-800">{note.body}</p>
                <p className="text-xs text-zinc-500 mt-1">{note.authorName} · {new Date(note.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
