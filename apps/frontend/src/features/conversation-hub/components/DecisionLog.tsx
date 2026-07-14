import { Gavel } from "lucide-react";
import type { DecisionLogEntry } from "@dmx/contracts/conversation-hub";
import { formatWhen } from "../lib/conversation-hub.utils";

interface Props {
  decisions: DecisionLogEntry[];
  onSelect?: (timelineItemId: string) => void;
}

export default function DecisionLog({ decisions, onSelect }: Props) {
  return (
    <section data-testid="hub-decision-log" className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Gavel className="h-4 w-4 text-emerald-700" />
        <h4 className="text-sm font-medium text-zinc-900">Decision Log</h4>
      </div>
      {decisions.length === 0 ? (
        <p className="text-xs text-zinc-500 px-1">No formal decisions recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {decisions.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                data-testid={`hub-decision-${d.id}`}
                className="w-full text-left rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 hover:bg-emerald-50"
                onClick={() => onSelect?.(d.timelineItemId)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-emerald-900">{d.title}</p>
                  <span className="text-[10px] uppercase text-emerald-600">{d.source}</span>
                </div>
                <p className="text-xs text-emerald-800/80 mt-0.5 line-clamp-2">{d.body}</p>
                <p className="text-[10px] text-emerald-600/70 mt-1">
                  {d.decidedBy ? `${d.decidedBy} · ` : ""}
                  {formatWhen(d.decidedAt)}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
