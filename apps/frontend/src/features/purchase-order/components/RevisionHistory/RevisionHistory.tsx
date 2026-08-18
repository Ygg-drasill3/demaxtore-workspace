import { useCallback, useEffect, useMemo, useState } from "react";
import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { resolveCurrentRevisionNumber } from "@dmx/contracts/purchase-order";
import { RevisionList } from "./RevisionList";
import { RevisionDrawer } from "./RevisionDrawer";
import { RevisionComparison } from "./RevisionComparison";

type Props = {
  purchaseOrderId: string;
  revisions: PurchaseOrderRevision[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Imperative open from Operational Timeline deep link. */
  openRevisionId?: string | null;
  onOpenRevisionConsumed?: () => void;
};

function RevisionListSkeleton() {
  return (
    <div data-testid="po-revision-history-skeleton" className="space-y-2 animate-pulse" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-zinc-100 border border-zinc-100" />
      ))}
    </div>
  );
}

/**
 * Sprint 29-01 — first-class Revision History for Purchase Orders.
 * Prefer revisions already loaded on PurchaseOrderSummary (no extra request).
 */
export function RevisionHistory({
  purchaseOrderId: _purchaseOrderId,
  revisions,
  isLoading = false,
  isError = false,
  onRetry,
  openRevisionId = null,
  onOpenRevisionConsumed,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comparePair, setComparePair] = useState<[PurchaseOrderRevision, PurchaseOrderRevision] | null>(null);
  const [comparePick, setComparePick] = useState<[string | null, string | null]>([null, null]);

  const enriched = useMemo(() => {
    const current = resolveCurrentRevisionNumber(revisions);
    return revisions.map((r) => ({
      ...r,
      isCurrent: r.isCurrent ?? (current != null && r.revisionNumber === current),
    }));
  }, [revisions]);

  const selected = useMemo(
    () => enriched.find((r) => r.id === selectedId) ?? null,
    [enriched, selectedId],
  );

  const openRevision = useCallback((revision: PurchaseOrderRevision) => {
    setSelectedId(revision.id);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!openRevisionId) return;
    const found = enriched.find((r) => r.id === openRevisionId);
    if (found) {
      setSelectedId(found.id);
      setDrawerOpen(true);
    }
    onOpenRevisionConsumed?.();
  }, [openRevisionId, enriched, onOpenRevisionConsumed]);

  const toggleCompare = useCallback((revision: PurchaseOrderRevision) => {
    setComparePick(([a, b]) => {
      if (a === revision.id) return [b, null];
      if (b === revision.id) return [a, null];
      if (!a) return [revision.id, null];
      if (!b) {
        const left = enriched.find((r) => r.id === a);
        const right = revision;
        if (left) {
          const ordered =
            left.revisionNumber <= right.revisionNumber ? [left, right] : [right, left];
          setComparePair(ordered as [PurchaseOrderRevision, PurchaseOrderRevision]);
        }
        return [null, null];
      }
      return [revision.id, null];
    });
  }, [enriched]);

  return (
    <section data-testid="po-revisions" className="dmx-card p-4" aria-labelledby="po-revision-history-heading">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 id="po-revision-history-heading" className="font-medium">
            Revision history
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Immutable snapshots from issuance and approved amendments.
          </p>
        </div>
        {comparePick[0] ? (
          <p className="text-xs text-zinc-600" data-testid="po-revision-compare-hint">
            Select another revision to compare
          </p>
        ) : null}
      </div>

      {isLoading ? <RevisionListSkeleton /> : null}

      {!isLoading && isError ? (
        <div data-testid="po-revision-history-error" className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-sm text-rose-900">Unable to load revision history.</p>
          {onRetry ? (
            <button
              type="button"
              data-testid="po-revision-history-retry"
              onClick={onRetry}
              className="text-sm font-medium text-rose-900 underline"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && enriched.length === 0 ? (
        <p data-testid="po-revision-history-empty" className="text-sm text-zinc-500">
          No revisions
          <span className="block mt-1 text-zinc-400">
            This Purchase Order has not been revised.
          </span>
        </p>
      ) : null}

      {!isLoading && !isError && enriched.length > 0 ? (
        <RevisionList
          revisions={enriched}
          selectedId={selectedId}
          compareIds={comparePick}
          onOpen={openRevision}
          onToggleCompare={toggleCompare}
        />
      ) : null}

      <RevisionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        revision={selected}
        revisions={enriched}
        allRevisions={enriched}
        onCompare={(left, right) => {
          setComparePair([left, right]);
          setDrawerOpen(false);
        }}
      />

      <RevisionComparison
        open={!!comparePair}
        onClose={() => setComparePair(null)}
        left={comparePair?.[0] ?? null}
        right={comparePair?.[1] ?? null}
      />
    </section>
  );
}

export default RevisionHistory;
