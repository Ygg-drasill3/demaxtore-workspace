import { useMemo } from "react";
import type { PurchaseOrderRevision } from "@dmx/contracts/purchase-order";
import { Drawer } from "@/components/ui/Drawer";
import { diffRevisionSnapshots, type LineDiff } from "./diff";

type Props = {
  open: boolean;
  onClose: () => void;
  left: PurchaseOrderRevision | null;
  right: PurchaseOrderRevision | null;
};

function DiffBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    added: "bg-emerald-100 text-emerald-800",
    removed: "bg-rose-100 text-rose-800",
    changed: "bg-amber-100 text-amber-900",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${styles[kind] ?? "bg-zinc-100 text-zinc-700"}`}>
      {kind}
    </span>
  );
}

function LineDiffBlock({ line }: { line: LineDiff }) {
  const title =
    line.after?.productName ||
    line.after?.description ||
    line.before?.productName ||
    line.before?.description ||
    line.key;

  return (
    <div
      data-testid={`po-revision-line-diff-${line.kind}`}
      className={`rounded-lg border p-3 space-y-2 ${
        line.kind === "added"
          ? "border-emerald-200 bg-emerald-50/40"
          : line.kind === "removed"
            ? "border-rose-200 bg-rose-50/40"
            : "border-amber-200 bg-amber-50/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <DiffBadge kind={line.kind} />
        <p className="text-sm font-medium text-zinc-900">{title}</p>
      </div>
      {line.changes.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {line.changes.map((c) => (
            <li key={c.field} data-testid={`po-revision-field-diff-${c.field}`} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-1">
              <span className="text-zinc-500">{c.label}</span>
              <span className="text-rose-700 line-through break-words">{c.before ?? "—"}</span>
              <span className="text-emerald-800 break-words">{c.after ?? "—"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RevisionComparison({ open, onClose, left, right }: Props) {
  const diff = useMemo(() => {
    if (!left || !right) return null;
    return diffRevisionSnapshots(left.snapshotJson, right.snapshotJson);
  }, [left, right]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        left && right
          ? `Compare Revision ${left.revisionNumber} → ${right.revisionNumber}`
          : "Compare revisions"
      }
      width="lg"
      testId="po-revision-comparison"
    >
      {!left || !right || !diff ? (
        <p className="p-5 text-sm text-zinc-500">Select two revisions to compare.</p>
      ) : (
        <div className="p-5 space-y-6" data-testid="po-revision-comparison-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-200 p-3" data-testid="po-revision-compare-left">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Before</p>
              <p className="font-medium">Revision {left.revisionNumber}</p>
              <p className="text-sm text-zinc-600 mt-1">{left.reason}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3" data-testid="po-revision-compare-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">After</p>
              <p className="font-medium">Revision {right.revisionNumber}</p>
              <p className="text-sm text-zinc-600 mt-1">{right.reason}</p>
            </div>
          </div>

          {diff.header.length === 0 && diff.lines.length === 0 ? (
            <p className="text-sm text-zinc-500" data-testid="po-revision-diff-empty">
              No differences detected between these snapshots.
            </p>
          ) : null}

          {diff.header.length > 0 ? (
            <section aria-labelledby="po-rev-header-diff">
              <h3 id="po-rev-header-diff" className="text-sm font-semibold mb-2">
                Commercial / header changes
              </h3>
              <ul className="space-y-2">
                {diff.header.map((f) => (
                  <li
                    key={f.field}
                    data-testid={`po-revision-header-diff-${f.field}`}
                    className="rounded border border-zinc-200 p-3 grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-2 text-sm"
                  >
                    <span className="font-medium flex items-center gap-2">
                      {f.label} <DiffBadge kind={f.kind} />
                    </span>
                    <span className="text-rose-700 line-through break-words">{f.before ?? "—"}</span>
                    <span className="text-emerald-800 break-words">{f.after ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {diff.lines.length > 0 ? (
            <section aria-labelledby="po-rev-line-diff">
              <h3 id="po-rev-line-diff" className="text-sm font-semibold mb-2">
                Product changes
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                Lines are matched by SKU, then description, then position — snapshots do not store line UUIDs.
              </p>
              <div className="space-y-3">
                {diff.lines.map((line) => (
                  <LineDiffBlock key={line.key} line={line} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
