import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { formatPoDate } from "../../lib/purchase-order.formatters";
import { isCurrentRevision } from "./diff";

type Props = {
  revision: PurchaseOrderRevision;
  revisions: PurchaseOrderRevision[];
  selected: boolean;
  onOpen: () => void;
  onCompareSelect?: () => void;
  compareSelected?: boolean;
};

export function RevisionRow({
  revision,
  revisions,
  selected,
  onOpen,
  onCompareSelect,
  compareSelected,
}: Props) {
  const current = revision.isCurrent ?? isCurrentRevision(revision.revisionNumber, revisions);
  const actorName = revision.createdBy?.name ?? "Unknown user";

  return (
    <li>
      <div
        className={`flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg border p-3 transition-colors ${
          selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <button
          type="button"
          data-testid={`po-revision-${revision.revisionNumber}`}
          aria-label={`Open revision ${revision.revisionNumber}`}
          onClick={onOpen}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">Revision {revision.revisionNumber}</span>
            {current ? (
              <span
                data-testid="po-revision-current-badge"
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800"
              >
                Current
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-700 mt-1 break-words">{revision.reason}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {formatPoDate(revision.createdAt)}
            <span className="mx-1.5" aria-hidden>
              ·
            </span>
            <span data-testid={`po-revision-actor-${revision.revisionNumber}`}>{actorName}</span>
          </p>
        </button>
        {onCompareSelect ? (
          <button
            type="button"
            data-testid={`po-revision-compare-select-${revision.revisionNumber}`}
            aria-pressed={compareSelected}
            onClick={onCompareSelect}
            className={`shrink-0 self-start text-xs px-2 py-1 rounded border ${
              compareSelected
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {compareSelected ? "Selected" : "Compare"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
