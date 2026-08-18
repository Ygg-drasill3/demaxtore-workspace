import { Link } from "react-router-dom";
import type { OperationalTimelineEvent } from "@dmx/contracts/operational-timeline";
import { Drawer } from "@/components/ui/Drawer";
import { TimelineEventIcon } from "./TimelineEventIcon";
import {
  categoryBadgeClass,
  formatAbsoluteTime,
  operationalEventCategoryLabel,
} from "./timeline-formatters";
import { purchaseOrderRoutes } from "../../lib/purchase-order.routes";

type Props = {
  open: boolean;
  event: OperationalTimelineEvent | null;
  onClose: () => void;
  onOpenRevision?: (revisionId: string) => void;
  onOpenDocument?: (documentId: string) => void;
};

export function TimelineEventDrawer({
  open,
  event,
  onClose,
  onOpenRevision,
  onOpenDocument,
}: Props) {
  const related = event?.relatedEntity;

  return (
    <Drawer
      open={open && !!event}
      onClose={onClose}
      title={event?.title ?? "Event"}
      width="lg"
      testId="po-timeline-drawer"
    >
      {event ? (
        <div className="space-y-5" data-testid="po-timeline-drawer-body">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
              <TimelineEventIcon name={event.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <span
                className={`inline-flex text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${categoryBadgeClass(event.category)}`}
              >
                {operationalEventCategoryLabel(event.category)}
              </span>
              <p className="text-sm text-zinc-600">{event.description || "No additional description."}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Actor</dt>
              <dd>{event.actor?.name ?? "System"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">When</dt>
              <dd>{formatAbsoluteTime(event.occurredAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Source</dt>
              <dd className="capitalize">{event.source.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Severity</dt>
              <dd className="capitalize">{event.severity ?? "info"}</dd>
            </div>
          </dl>

          {event.metadata && Object.keys(event.metadata).length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Metadata
              </h3>
              <ul className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 text-sm">
                {Object.entries(event.metadata).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3 px-3 py-2">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-ink-900 text-right break-all">{String(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {related ? (
            <div className="space-y-2" data-testid="po-timeline-related-links">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Related
              </h3>
              {related.type === "REVISION" && onOpenRevision ? (
                <button
                  type="button"
                  data-testid="po-timeline-open-revision"
                  className="dmx-btn-secondary text-sm w-full sm:w-auto"
                  onClick={() => {
                    onOpenRevision(related.id);
                    onClose();
                  }}
                >
                  Open Revision
                </button>
              ) : null}
              {related.type === "DOCUMENT" && onOpenDocument ? (
                <button
                  type="button"
                  data-testid="po-timeline-open-document"
                  className="dmx-btn-secondary text-sm w-full sm:w-auto"
                  onClick={() => {
                    onOpenDocument(related.id);
                    onClose();
                  }}
                >
                  Open Document
                </button>
              ) : null}
              {related.type === "SHIPMENT" ? (
                <Link
                  to={`/workspace/shipment/${related.id}`}
                  data-testid="po-timeline-open-shipment"
                  className="dmx-btn-secondary text-sm inline-flex"
                  onClick={onClose}
                >
                  Open Shipment
                </Link>
              ) : null}
              {related.type === "INSPECTION" && event.orderId ? (
                <Link
                  to={`${purchaseOrderRoutes.orderWorkspace(event.orderId)}?focus=inspection`}
                  data-testid="po-timeline-open-inspection"
                  className="dmx-btn-secondary text-sm inline-flex"
                  onClick={onClose}
                >
                  Open Inspection
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
