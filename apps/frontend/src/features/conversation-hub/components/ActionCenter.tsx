import { AlertCircle } from "lucide-react";
import type { PendingAction } from "@dmx/contracts/conversation-hub";
import { formatWhen } from "../lib/conversation-hub.utils";

interface Props {
  actions: PendingAction[];
  onSelect?: (timelineItemId: string | null) => void;
}

const KIND_STYLES: Record<PendingAction["kind"], string> = {
  WAITING_SUPPLIER_REPLY: "border-amber-200 bg-amber-50",
  BUYER_APPROVAL_REQUIRED: "border-rose-200 bg-rose-50",
  INSPECTION_REPORT_WAITING: "border-orange-200 bg-orange-50",
  ETA_UPDATED: "border-sky-200 bg-sky-50",
  DOCUMENT_MISSING: "border-zinc-200 bg-zinc-50",
  ACTION_REQUIRED: "border-violet-200 bg-violet-50",
  UNANSWERED_QUESTION: "border-amber-200 bg-amber-50",
};

export default function ActionCenter({ actions, onSelect }: Props) {
  if (!actions.length) {
    return (
      <section data-testid="hub-action-center" className="mx-4 mt-4 rounded-lg border border-zinc-100 p-4">
        <h4 className="text-sm font-medium text-zinc-800">Pending Actions</h4>
        <p className="text-xs text-zinc-500 mt-2">No pending actions — operation is on track.</p>
      </section>
    );
  }

  return (
    <section data-testid="hub-action-center" className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-rose-600" />
        <h4 className="text-sm font-medium text-zinc-900">Pending Actions</h4>
        <span className="text-xs text-zinc-500">({actions.length})</span>
      </div>
      <ul className="space-y-2">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              data-testid={`hub-pending-${action.id}`}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition hover:shadow-sm ${KIND_STYLES[action.kind]}`}
              onClick={() => onSelect?.(action.timelineItemId)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900">{action.title}</p>
                <span className="text-[10px] uppercase text-zinc-500">{action.priority}</span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{action.description}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{formatWhen(action.createdAt)}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
