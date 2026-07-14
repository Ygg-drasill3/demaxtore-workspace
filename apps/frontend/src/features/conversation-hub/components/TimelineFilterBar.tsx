import type { TimelineFilter } from "../lib/conversation-hub.types";
import { TIMELINE_FILTERS } from "../lib/conversation-hub.utils";

interface Props {
  active: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
}

export default function TimelineFilterBar({ active, onChange }: Props) {
  return (
    <div
      data-testid="hub-filters"
      className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-zinc-100 bg-zinc-50/50"
    >
      {TIMELINE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          data-testid={`hub-filter-${f.id}`}
          className={`text-xs px-2.5 py-1 rounded-full border transition ${
            active === f.id
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
          }`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
