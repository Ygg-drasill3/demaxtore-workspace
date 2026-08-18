import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { RevisionRow } from "./RevisionRow";

type Props = {
  revisions: PurchaseOrderRevision[];
  selectedId: string | null;
  compareIds: [string | null, string | null];
  onOpen: (revision: PurchaseOrderRevision) => void;
  onToggleCompare: (revision: PurchaseOrderRevision) => void;
};

export function RevisionList({
  revisions,
  selectedId,
  compareIds,
  onOpen,
  onToggleCompare,
}: Props) {
  const sorted = [...revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);

  return (
    <ul className="space-y-2" data-testid="po-revision-list" role="list">
      {sorted.map((r) => (
        <RevisionRow
          key={r.id}
          revision={r}
          revisions={revisions}
          selected={selectedId === r.id}
          compareSelected={compareIds[0] === r.id || compareIds[1] === r.id}
          onOpen={() => onOpen(r)}
          onCompareSelect={() => onToggleCompare(r)}
        />
      ))}
    </ul>
  );
}
