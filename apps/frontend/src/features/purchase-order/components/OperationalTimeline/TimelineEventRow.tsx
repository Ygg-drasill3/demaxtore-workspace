import type { OperationalTimelineEvent } from "@dmx/contracts/operational-timeline";
import { TimelineEventIcon } from "./TimelineEventIcon";
import {
  categoryBadgeClass,
  formatAbsoluteTime,
  formatRelativeTime,
  operationalEventCategoryLabel,
  severityDotClass,
} from "./timeline-formatters";

type Props = {
  event: OperationalTimelineEvent;
  onOpen: (event: OperationalTimelineEvent) => void;
};

export function TimelineEventRow({ event, onOpen }: Props) {
  return (
    <li className="relative pl-8 sm:pl-10">
      <span
        className={`absolute left-1.5 top-3 h-2.5 w-2.5 rounded-full ring-4 ring-white ${severityDotClass(event.severity)}`}
        aria-hidden
      />
      <button
        type="button"
        data-testid={`po-timeline-event-${event.id}`}
        onClick={() => onOpen(event)}
        className="w-full text-left rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 sm:px-4 hover:border-zinc-300 hover:bg-zinc-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-900/30"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 hidden sm:grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700 shrink-0">
            <TimelineEventIcon name={event.icon} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-ink-900">{event.title}</h3>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${categoryBadgeClass(event.category)}`}
              >
                {operationalEventCategoryLabel(event.category)}
              </span>
            </div>
            {event.description ? (
              <p className="text-xs text-zinc-500 line-clamp-2">{event.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
              {event.actor?.name ? <span>{event.actor.name}</span> : <span>System</span>}
              <span title={formatAbsoluteTime(event.occurredAt)}>{formatRelativeTime(event.occurredAt)}</span>
              <span className="hidden sm:inline">{formatAbsoluteTime(event.occurredAt)}</span>
            </div>
          </div>
          <span className="text-xs font-medium text-accent-900 shrink-0 self-center">Details</span>
        </div>
      </button>
    </li>
  );
}
