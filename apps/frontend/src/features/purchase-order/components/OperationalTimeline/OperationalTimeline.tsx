import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  OPERATIONAL_EVENT_CATEGORIES,
  TIMELINE_GROUP_LABELS,
  resolveTimelineGroupKey,
  type OperationalEventCategory,
  type OperationalTimelineEvent,
} from "@dmx/contracts/operational-timeline";
import { operationalTimelineApi } from "../../lib/operational-timeline.api";
import { purchaseOrderKeys } from "../../lib/purchase-order.query-keys";
import { TimelineEventRow } from "./TimelineEventRow";
import { TimelineEventDrawer } from "./TimelineEventDrawer";
import { operationalEventCategoryLabel } from "./timeline-formatters";

type Props = {
  purchaseOrderId: string;
  onOpenRevision?: (revisionId: string) => void;
  onOpenDocument?: (documentId: string) => void;
};

const PAGE_SIZE = 25;

export function OperationalTimeline({
  purchaseOrderId,
  onOpenRevision,
  onOpenDocument,
}: Props) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<OperationalEventCategory | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<OperationalTimelineEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({
      category: category || undefined,
      search: debouncedSearch || undefined,
      pageSize: PAGE_SIZE,
    }),
    [category, debouncedSearch],
  );

  const query = useInfiniteQuery({
    queryKey: purchaseOrderKeys.timeline(purchaseOrderId, filters),
    queryFn: ({ pageParam }) =>
      operationalTimelineApi.list(purchaseOrderId, {
        ...filters,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    retry: false,
  });

  const events = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const availableCategories =
    query.data?.pages[0]?.availableCategories ?? [...OPERATIONAL_EVENT_CATEGORIES];

  const groups = useMemo(() => {
    const map = new Map<string, OperationalTimelineEvent[]>();
    for (const e of events) {
      const key = resolveTimelineGroupKey(e.occurredAt);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return (["today", "yesterday", "last7", "older"] as const)
      .filter((k) => (map.get(k)?.length ?? 0) > 0)
      .map((k) => ({ key: k, label: TIMELINE_GROUP_LABELS[k], items: map.get(k)! }));
  }, [events]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting) && query.hasNextPage && !query.isFetchingNextPage) {
                void query.fetchNextPage();
              }
            },
            { rootMargin: "120px" },
          )
        : null;
    if (!obs) return;
    obs.observe(el);
    return () => obs.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const openEvent = (event: OperationalTimelineEvent) => {
    setSelected(event);
    setDrawerOpen(true);
  };

  return (
    <section
      data-testid="po-timeline"
      className="dmx-card p-4"
      aria-labelledby="po-timeline-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h2 id="po-timeline-heading" className="font-medium">
            Operational Timeline
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Unified history from purchase order, revisions, documents, inspection, and shipment.
          </p>
        </div>
        <p className="text-xs text-zinc-500" data-testid="po-timeline-count">
          {total} event{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          data-testid="po-timeline-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, document, reason…"
          className="dmx-input text-sm flex-1"
          aria-label="Search timeline"
        />
        <select
          data-testid="po-timeline-category-filter"
          value={category}
          onChange={(e) => setCategory((e.target.value || "") as OperationalEventCategory | "")}
          className="dmx-input text-sm sm:w-48"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {operationalEventCategoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <div data-testid="po-timeline-skeleton" className="space-y-2 animate-pulse" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-100 border border-zinc-100" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <div
          data-testid="po-timeline-error"
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2"
        >
          <p className="text-sm text-rose-800">Could not load timeline.</p>
          <button
            type="button"
            className="dmx-btn-secondary text-xs"
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && events.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="po-timeline-empty">
          No events match the current filters.
        </p>
      ) : null}

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.key} data-testid={`po-timeline-group-${g.key}`}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              {g.label}
            </h3>
            <ol className="relative space-y-2 border-l border-zinc-200 ml-2 sm:ml-3">
              {g.items.map((event) => (
                <TimelineEventRow key={event.id} event={event} onOpen={openEvent} />
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />
      {query.isFetchingNextPage ? (
        <p className="text-xs text-zinc-500 mt-2" data-testid="po-timeline-loading-more">
          Loading more…
        </p>
      ) : null}

      <TimelineEventDrawer
        open={drawerOpen}
        event={selected}
        onClose={() => setDrawerOpen(false)}
        onOpenRevision={onOpenRevision}
        onOpenDocument={(docId) => {
          onOpenDocument?.(docId);
          void qc.invalidateQueries({ queryKey: purchaseOrderKeys.documents(purchaseOrderId) });
        }}
      />
    </section>
  );
}
