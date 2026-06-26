// apps/frontend/src/features/rfq/components/RfqTimeline.tsx
//
// Sprint 2.5 — collapsed-by-default audit feed with daily groups and
// story / activity tiers. The Timeline is no longer the primary content;
// it sits below the fold and answers "what happened?", not "what now?".
//
import { useMemo, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { useRfqTimeline } from "../hooks";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  "rfq.created":                  "RFQ created",
  "rfq.submitted":                "RFQ submitted for triage",
  "rfq.rejected_by_admin":        "RFQ returned by DeMaxtore",
  "rfq.revised_from_rejection":   "Revised draft resubmitted",
  "rfq.suppliers.assigned":       "Suppliers assigned",
  "rfq.suppliers.added":          "Additional suppliers added",
  "rfq.suppliers.removed":        "Supplier removed",
  "rfq.published":                "RFQ published — quotations open",
  "rfq.deadline.extended":        "Deadline extended",
  "rfq.quotations.closed_manual": "Quotations closed early",
  "rfq.quotations.closed_auto":   "Quotation deadline reached",
  "rfq.quotations.reopened":      "Quotations reopened (admin)",
  "rfq.expired":                  "RFQ expired with no bids",
  "rfq.clarification.posted":    "Clarification posted",
  "rfq.evaluation.started":       "Evaluation started",
  "rfq.supplier.selected":        "Supplier selected",
  "rfq.selection.reverted":       "Selection reverted",
  "rfq.closed_no_award":          "Closed without award",
  "quotation.submitted":          "Quotation submitted",
  "quotation.revised":            "Quotation revised",
  "quotation.withdrawn":          "Quotation withdrawn",
  "proforma.requested":           "Proforma requested",
  "proforma.submitted":           "Proforma uploaded",
  "proforma.declined_by_supplier":"Supplier declined proforma",
  "proforma.sla_expired":         "Proforma SLA expired",
  "proforma.approved":            "Proforma approved",
  "proforma.rejected":            "Proforma revision requested",
  "po.issued":                    "PO issued",
  "rfq.cancelled":                "RFQ cancelled",
  "workspace.participant.added":  "Participant added",
  "workspace.participant.removed":"Participant removed",
};

const STORY_EVENT_TYPES = new Set([
  "rfq.created", "rfq.submitted", "rfq.rejected_by_admin", "rfq.revised_from_rejection",
  "rfq.suppliers.assigned", "rfq.published", "rfq.quotations.closed_manual",
  "rfq.quotations.closed_auto", "rfq.quotations.reopened", "rfq.expired",
  "rfq.evaluation.started", "rfq.supplier.selected", "rfq.selection.reverted",
  "rfq.closed_no_award", "proforma.requested", "proforma.submitted",
  "proforma.approved", "po.issued", "rfq.cancelled",
]);

interface TimelineEvent {
  id:          string;
  eventType:   string;
  actorUserId: string | null;
  actorName?:  string;
  createdAt:   string;
  payload:     Record<string, unknown> | null;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const that  = new Date(d); that.setHours(0,0,0,0);
  const days  = Math.floor((today.getTime() - that.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function hmm(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  workspaceId: string;
  /** When true (default), shows only the 5 most-recent events with a "show all" link. */
  collapsed?:  boolean;
  pageSize?:   number;
}

export function RfqTimeline({ workspaceId, collapsed = true, pageSize = 5 }: Props) {
  const [expanded, setExpanded] = useState(!collapsed);
  const { data, isLoading } = useRfqTimeline(workspaceId, { enabled: expanded });
  const [filter, setFilter] = useState<"all" | "story" | "activity">("all");

  const events = (data ?? []) as TimelineEvent[];

  const visible = useMemo(() => {
    let list = events;
    if (filter === "story")    list = list.filter((e) => STORY_EVENT_TYPES.has(e.eventType));
    if (filter === "activity") list = list.filter((e) => !STORY_EVENT_TYPES.has(e.eventType));
    if (!expanded) list = list.slice(0, pageSize);
    return list;
  }, [events, filter, expanded, pageSize]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of visible) {
      const k = dayKey(e.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [visible]);

  if (isLoading) {
    return (
      <div data-testid="rfq-timeline-loading" className="dmx-card p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }
  if (events.length === 0) {
    return <div data-testid="rfq-timeline-empty"
                className="dmx-card p-10 text-center text-sm text-zinc-500">No events yet.</div>;
  }

  return (
    <div data-testid="rfq-timeline" className="dmx-card p-5">
      <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-zinc-500" />
          <h3 className="font-display text-base font-semibold tracking-tight">Timeline</h3>
          <span className="text-xs text-zinc-400">{events.length} events</span>
        </div>
        <div className="dmx-card p-0.5 flex items-center text-xs bg-paper-50/60">
          {(["all","story","activity"] as const).map((k) => (
            <button key={k}
                    data-testid={`timeline-filter-${k}`}
                    onClick={() => setFilter(k)}
                    className={cn("px-2.5 py-1 rounded-md capitalize",
                      filter === k ? "bg-ink-950 text-white" : "text-zinc-500")}>
              {k}
            </button>
          ))}
        </div>
      </header>

      <ol className="space-y-4">
        {grouped.map(([day, items]) => (
          <li key={day}>
            <div data-testid={`timeline-day-${day}`}
                 className="dmx-eyebrow mb-2 text-zinc-400">─── {day} ───</div>
            <ul className="space-y-2.5">
              {items.map((e) => {
                const story = STORY_EVENT_TYPES.has(e.eventType);
                const reason = (e.payload as any)?.reason as string | undefined;
                return (
                  <li key={e.id}
                      data-testid={`rfq-timeline-event-${e.id}`}
                      data-tier={story ? "story" : "activity"}
                      className="flex gap-3 items-start">
                    <span className={cn("mt-2 h-2 w-2 rounded-full shrink-0",
                      story ? "bg-accent-900" : "bg-zinc-300")} />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm leading-snug",
                        story ? "text-ink-900 font-medium" : "text-zinc-600")}>
                        {EVENT_LABELS[e.eventType] ?? e.eventType}
                        {e.actorName && <span className="text-zinc-500 font-normal"> · {e.actorName}</span>}
                        <span className="text-xs text-zinc-400 ml-2 tabular-nums">{hmm(e.createdAt)}</span>
                      </div>
                      {reason && (
                        <blockquote data-testid={`rfq-timeline-reason-${e.id}`}
                                    className="mt-1 text-xs text-zinc-600 border-l-2 border-paper-200 pl-2.5">
                          "{reason}"
                        </blockquote>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {collapsed && events.length > pageSize && (
        <button
          data-testid="timeline-expand"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs text-accent-900 font-medium hover:underline"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Collapse" : `Show full audit log (${events.length} events)`}
        </button>
      )}
    </div>
  );
}
