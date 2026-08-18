import { lazy, Suspense, useMemo, useState } from "react";
import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { Drawer } from "@/components/ui/Drawer";
import { formatPoDate } from "../../lib/purchase-order.formatters";
import { isCurrentRevision } from "./diff";

const RevisionSnapshot = lazy(() =>
  import("./RevisionSnapshot").then((m) => ({ default: m.RevisionSnapshot })),
);

type Props = {
  open: boolean;
  onClose: () => void;
  revision: PurchaseOrderRevision | null;
  revisions: PurchaseOrderRevision[];
  allRevisions: PurchaseOrderRevision[];
  onCompare: (left: PurchaseOrderRevision, right: PurchaseOrderRevision) => void;
};

function DrawerSkeleton() {
  return (
    <div data-testid="po-revision-drawer-skeleton" className="p-5 space-y-4 animate-pulse" aria-hidden>
      <div className="h-4 w-40 bg-zinc-200 rounded" />
      <div className="h-3 w-56 bg-zinc-100 rounded" />
      <div className="h-28 bg-zinc-100 rounded" />
      <div className="h-40 bg-zinc-100 rounded" />
    </div>
  );
}

export function RevisionDrawer({
  open,
  onClose,
  revision,
  revisions,
  allRevisions,
  onCompare,
}: Props) {
  const [compareWithId, setCompareWithId] = useState<string>("");

  const current = revision
    ? revision.isCurrent ?? isCurrentRevision(revision.revisionNumber, revisions)
    : false;

  const compareOptions = useMemo(() => {
    if (!revision) return [];
    return [...allRevisions]
      .filter((r) => r.id !== revision.id)
      .sort((a, b) => a.revisionNumber - b.revisionNumber);
  }, [allRevisions, revision]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={revision ? `Revision ${revision.revisionNumber}` : "Revision"}
      width="lg"
      testId="po-revision-drawer"
    >
      {!revision ? (
        <DrawerSkeleton />
      ) : (
        <div className="p-5 space-y-5">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Revision {revision.revisionNumber}</h3>
              {current ? (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                  Current
                </span>
              ) : null}
            </div>
            <p className="text-sm text-zinc-700">{revision.reason}</p>
            <p className="text-xs text-zinc-500">
              Created {formatPoDate(revision.createdAt)}
              <span className="mx-1.5" aria-hidden>
                ·
              </span>
              {revision.createdBy?.name ?? "Unknown user"}
            </p>
          </header>

          {compareOptions.length > 0 ? (
            <div
              className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-zinc-200 p-3"
              data-testid="po-revision-compare-controls"
            >
              <label className="flex-1 text-xs text-zinc-600 space-y-1">
                <span>Compare with</span>
                <select
                  data-testid="po-revision-compare-select"
                  className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  value={compareWithId}
                  onChange={(e) => setCompareWithId(e.target.value)}
                >
                  <option value="">Select a revision…</option>
                  {compareOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      Revision {r.revisionNumber} — {r.reason.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                data-testid="po-revision-compare-open"
                disabled={!compareWithId}
                className="rounded bg-zinc-900 text-white text-sm px-3 py-1.5 disabled:opacity-40"
                onClick={() => {
                  const other = allRevisions.find((r) => r.id === compareWithId);
                  if (!other || !revision) return;
                  const [left, right] =
                    revision.revisionNumber <= other.revisionNumber
                      ? [revision, other]
                      : [other, revision];
                  onCompare(left, right);
                }}
              >
                Compare
              </button>
            </div>
          ) : null}

          <Suspense fallback={<DrawerSkeleton />}>
            <RevisionSnapshot snapshotJson={revision.snapshotJson} />
          </Suspense>
        </div>
      )}
    </Drawer>
  );
}
