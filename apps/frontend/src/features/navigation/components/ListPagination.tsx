export function ListPagination({
  offset,
  limit,
  total,
  onPageChange,
  testId,
}: {
  offset: number;
  limit: number;
  total: number;
  onPageChange: (nextOffset: number) => void;
  testId: string;
}) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);

  return (
    <div data-testid={testId} className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 text-sm">
      <span className="text-zinc-500">
        Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="dmx-btn-secondary text-sm"
          disabled={offset === 0}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <span className="px-2 py-1 text-zinc-600 tabular-nums">{page} / {pages}</span>
        <button
          type="button"
          className="dmx-btn-secondary text-sm"
          disabled={offset + limit >= total}
          onClick={() => onPageChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
