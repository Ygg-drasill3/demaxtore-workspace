import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Inbox, RefreshCw } from "lucide-react";
import type { InboxFilter } from "@dmx/contracts/workspace-inbox";
import { workspaceInboxApi } from "../lib/workspace-inbox.api";
import { INBOX_FILTERS } from "../lib/workspace-inbox.utils";
import InboxSummaryRow from "../components/InboxSummaryRow";
import InboxAiPlaceholder from "../components/InboxAiPlaceholder";
import InboxPriorities from "../components/InboxPriorities";
import InboxRecentActivity from "../components/InboxRecentActivity";
import InboxWorkspaceCards from "../components/InboxWorkspaceCards";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

export default function WorkspaceInboxPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [debouncedQ, setDebouncedQ] = useState("");

  const queryParams = useMemo(
    () => ({ q: debouncedQ || undefined, filter: filter === "all" ? undefined : filter }),
    [debouncedQ, filter],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["workspace-inbox", queryParams],
    queryFn: () => workspaceInboxApi.get(queryParams),
  });

  const onSearch = () => setDebouncedQ(search.trim());

  if (isLoading && !data) return <PageSkeleton />;

  if (isError || !data) {
    return (
      <div data-testid="workspace-inbox-error" className="max-w-lg mx-auto p-8 text-center space-y-4">
        <p className="text-red-600">Could not load Workspace Inbox.</p>
        <button type="button" className="dmx-btn-secondary" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="workspace-inbox" className="max-w-[1600px] mx-auto space-y-6 pb-10 animate-fade-in">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Inbox className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-[0.16em]">Operational Home</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            Workspace Inbox
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">
            What happened, what needs attention, and what to do next — across all active workspaces.
          </p>
        </div>
        <button
          type="button"
          className="dmx-btn-secondary text-sm inline-flex items-center gap-2 self-start"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <InboxAiPlaceholder />

      <InboxSummaryRow summary={data.summary} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="inbox-search"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-lg bg-white"
            placeholder="Search workspace, supplier, buyer, product, country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>
        <button type="button" className="dmx-btn-primary text-sm px-4" onClick={onSearch}>
          Search
        </button>
      </div>

      <div data-testid="inbox-filters" className="flex flex-wrap gap-1.5">
        {INBOX_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            data-testid={`inbox-filter-${f.id}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === f.id
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile-first: priorities & activity before cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InboxPriorities priorities={data.priorities} />
        <InboxRecentActivity activity={data.recentActivity} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Workspaces</h2>
          <span className="text-xs text-zinc-500">{data.totalWorkspaces} total</span>
        </div>
        <InboxWorkspaceCards workspaces={data.workspaces} />
      </section>
    </div>
  );
}
