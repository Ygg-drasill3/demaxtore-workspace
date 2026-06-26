import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

type Row = {
  id: string;
  externalRef: string;
  state: string;
  updatedAt?: string;
  detailHref: string;
};

export function RecentRequestsPanel({
  title,
  rows,
  isLoading,
  emptyHint,
  viewAllHref,
  testId,
}: {
  title: string;
  rows: Row[];
  isLoading: boolean;
  emptyHint: string;
  viewAllHref: string;
  testId: string;
}) {
  return (
    <section data-testid={testId} className="dmx-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <h2 className="font-medium text-sm">{title}</h2>
        <Link to={viewAllHref} className="text-xs text-accent-900 hover:underline">View all</Link>
      </div>
      {isLoading ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {rows.slice(0, 5).map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50">
              <div className="min-w-0">
                <span className="font-mono text-xs text-zinc-700">{r.externalRef}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{r.state.replace(/_/g, " ")}</p>
              </div>
              <Link to={r.detailHref} className="shrink-0 text-sm text-accent-900 hover:underline inline-flex items-center gap-1">
                Open <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
