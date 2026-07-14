import type { ConversationSummary } from "@dmx/contracts/conversation-hub";

interface Props {
  summary: ConversationSummary;
}

function SummaryItem({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">{label}</p>
      <p
        className={`text-sm truncate ${highlight ? "font-medium text-rose-700" : "text-zinc-800"}`}
        title={value ?? undefined}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function ConversationSummaryCard({ summary }: Props) {
  return (
    <section
      data-testid="hub-summary-card"
      className="mx-4 mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
    >
      <p className="text-xs font-medium text-zinc-500 mb-3">Operational snapshot</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryItem label="Current Supplier" value={summary.currentSupplier} />
        <SummaryItem label="Current Stage" value={summary.currentStage} />
        <SummaryItem label="Shipment Status" value={summary.shipmentStatus} />
        <SummaryItem label="Last Decision" value={summary.lastDecision} />
        <SummaryItem label="Last Document" value={summary.lastDocumentUploaded} />
        <SummaryItem label="Next Required Action" value={summary.nextRequiredAction} highlight />
      </div>
    </section>
  );
}
