import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  FileText,
  Info,
  Package,
  Ship,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeTimelineEventDto, TradeTimelineSeverity } from "@dmx/contracts/trade-timeline";

const SEVERITY_STYLES: Record<TradeTimelineSeverity, string> = {
  INFO: "border-zinc-200 bg-white",
  SUCCESS: "border-emerald-200 bg-emerald-50/40",
  WARNING: "border-amber-200 bg-amber-50/40",
  CRITICAL: "border-red-200 bg-red-50/40",
};

const CATEGORY_ICONS: Record<string, typeof Info> = {
  SOURCE: FileText,
  PROCUREMENT: Package,
  FREIGHT: Anchor,
  PRODUCTION: Package,
  INSPECTION: CheckCircle2,
  SHIPMENT: Ship,
  DOCUMENT: FileText,
  EXCEPTION: AlertTriangle,
  DELIVERY: Truck,
};

interface TradeTimelineEventCardProps {
  event: TradeTimelineEventDto;
}

export function TradeTimelineEventCard({ event }: TradeTimelineEventCardProps) {
  const Icon = CATEGORY_ICONS[event.eventCategory] ?? Info;
  const severityClass = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.INFO;

  return (
    <article
      data-testid={`trade-timeline-event-${event.id}`}
      className={cn("rounded-lg border p-4 text-sm", severityClass)}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-white border border-zinc-200 grid place-items-center">
          <Icon className="h-4 w-4 text-zinc-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-medium text-ink-900">{event.title}</h3>
            <span
              data-testid={`trade-timeline-severity-${event.id}`}
              className="text-[10px] uppercase tracking-wider text-zinc-500"
            >
              {event.severity}
            </span>
          </div>
          {event.description && (
            <p className="mt-1 text-xs text-zinc-600">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            <time dateTime={event.occurredAt}>
              {new Date(event.occurredAt).toLocaleString()}
            </time>
            <span data-testid={`trade-timeline-source-${event.id}`}>{event.sourceModule}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
