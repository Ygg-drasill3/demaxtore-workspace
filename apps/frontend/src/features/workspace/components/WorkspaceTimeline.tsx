import { useMemo, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEventRow {
  id: string;
  eventType: string;
  createdAt: string;
  actorName?: string;
}

interface Props {
  events: TimelineEventRow[];
  eventLabels: Record<string, string>;
  storyEventTypes?: Set<string>;
  testId?: string;
  title?: string;
  filterPrefix?: string;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - that.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function hmm(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WorkspaceTimeline({
  events,
  eventLabels,
  storyEventTypes,
  testId = "workspace-timeline",
  title = "Activity log",
  filterPrefix,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tier, setTier] = useState<"story" | "all">("story");

  const filtered = useMemo(() => {
    let list = filterPrefix ? events.filter((e) => e.eventType.startsWith(filterPrefix)) : events;
    if (tier === "story" && storyEventTypes) {
      list = list.filter((e) => storyEventTypes.has(e.eventType));
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [events, filterPrefix, tier, storyEventTypes]);

  const visible = expanded ? filtered : filtered.slice(0, 5);
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEventRow[]>();
    for (const e of visible) {
      const k = dayKey(e.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()];
  }, [visible]);

  if (!filtered.length) return null;

  return (
    <section data-testid={testId} className="dmx-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-paper-50/80"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-zinc-400" />
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-zinc-500">({filtered.length})</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && storyEventTypes && (
        <div className="px-5 pb-2 flex gap-2">
          {(["story", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                tier === t ? "bg-accent-900 text-white" : "bg-paper-100 text-zinc-600",
              )}
            >
              {t === "story" ? "Key events" : "All activity"}
            </button>
          ))}
        </div>
      )}
      <div className="px-5 pb-4 space-y-4 border-t border-paper-100 pt-3">
        {grouped.map(([day, items]) => (
          <div key={day}>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">{day}</div>
            <ul className="space-y-2">
              {items.map((e) => (
                <li key={e.id} className="flex gap-3 text-xs">
                  <span className="text-zinc-400 tabular-nums shrink-0 w-12">{hmm(e.createdAt)}</span>
                  <span className="text-ink-900">{eventLabels[e.eventType] ?? e.eventType.replace(/\./g, " ")}</span>
                  {e.actorName && <span className="text-zinc-500">· {e.actorName}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export const FREIGHT_EVENT_LABELS: Record<string, string> = {
  "freight.request.created": "Freight quote requested",
  "freight.communication.sent": "Forwarders contacted",
  "freight.communication.responded": "Forwarder responded",
  "freight.offer.intake.created": "Offer received",
  "freight.offer.submitted": "Offer submitted",
  "freight.offer.revised": "Offer revised",
  "freight.offer.selected": "Carrier selected",
  "freight.request.cancelled": "Freight request cancelled",
};

export const ORDER_EVENT_LABELS: Record<string, string> = {
  "order.created": "Order created",
  "order.confirmed": "Supplier confirmed",
  "order.production.started": "Production started",
  "order.production.completed": "Production completed",
  "freight.request.created": "Freight quote requested",
  "freight.offer.selected": "Carrier selected",
};

export const FREIGHT_STORY_EVENTS = new Set(Object.keys(FREIGHT_EVENT_LABELS));
