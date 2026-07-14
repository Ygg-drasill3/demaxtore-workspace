import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import type { InboxPriority } from "@dmx/contracts/workspace-inbox";
import { formatWhen } from "../lib/workspace-inbox.utils";

const URGENCY_STYLES: Record<InboxPriority["urgency"], string> = {
  critical: "border-l-red-500 bg-red-50/50",
  high: "border-l-rose-500 bg-rose-50/40",
  medium: "border-l-amber-400 bg-amber-50/30",
  low: "border-l-zinc-300 bg-zinc-50",
};

interface Props {
  priorities: InboxPriority[];
}

export default function InboxPriorities({ priorities }: Props) {
  if (!priorities.length) {
    return (
      <section data-testid="inbox-priorities" className="dmx-card p-4">
        <h2 className="text-sm font-semibold text-zinc-900">My Priorities</h2>
        <p className="text-xs text-zinc-500 mt-2">No urgent items — you are up to date.</p>
      </section>
    );
  }

  return (
    <section data-testid="inbox-priorities" className="dmx-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <h2 className="text-sm font-semibold text-zinc-900">My Priorities</h2>
        <span className="text-xs text-zinc-500">({priorities.length})</span>
      </div>
      <ul className="space-y-2 max-h-80 overflow-auto">
        {priorities.map((p) => (
          <li key={p.id}>
            <Link
              to={p.conversationUrl}
              data-testid={`inbox-priority-${p.id}`}
              className={`block rounded-lg border border-zinc-100 border-l-4 px-3 py-2.5 hover:shadow-sm transition ${URGENCY_STYLES[p.urgency]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{p.description}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {p.workspaceRef} · {p.workspaceType} · {formatWhen(p.createdAt)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
