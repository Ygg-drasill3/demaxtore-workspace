import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { fetchBuyerMessageListPaged } from "@/features/navigation/lib/buyer-portfolio";
import { fetchSupplierMessageListPaged } from "@/features/navigation/lib/supplier-portfolio";
import { ListPagination } from "@/features/navigation/components/ListPagination";

const PAGE_SIZE = 25;

export default function MessagesListPage() {
  const isSupplier = useLocation().pathname.startsWith("/supplier");
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [isSupplier ? "supplier" : "buyer", "messages-list", offset],
    queryFn: () => (isSupplier ? fetchSupplierMessageListPaged : fetchBuyerMessageListPaged)({ limit: PAGE_SIZE, offset }),
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalUnread = rows.reduce((n, r) => n + r.unreadCount, 0);

  return (
    <div data-testid="messages-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Collaboration</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Messages</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Workspace conversations across RFQs and orders
          {totalUnread > 0 && (
            <span data-testid="messages-unread-total" className="ml-2 text-amber-700 font-medium">
              · {totalUnread} unread
            </span>
          )}
        </p>
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Could not load conversations.</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      <div className="dmx-card overflow-hidden divide-y divide-zinc-100">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-zinc-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div data-testid="messages-list-empty" className="px-4 py-12 text-center text-zinc-500">
            No conversations yet. Messages appear inside RFQ and order workspaces.
          </div>
        ) : rows.map((r) => (
          <div
            key={`${r.workspaceType}-${r.workspaceId}`}
            data-testid={`messages-list-row-${r.workspaceId}`}
            className="px-4 py-4 flex items-start justify-between gap-4 hover:bg-zinc-50/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-600">{r.workspaceRef}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">{r.workspaceType}</span>
                {r.unreadCount > 0 && (
                  <span data-testid={`messages-unread-${r.workspaceId}`} className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full">
                    {r.unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-700 mt-1 truncate">{r.lastMessage}</p>
              {r.lastAt && (
                <p className="text-xs text-zinc-400 mt-1">{new Date(r.lastAt).toLocaleString()}</p>
              )}
            </div>
            <Link
              to={`${r.workspaceUrl}?focus=messages`}
              data-testid={`messages-open-${r.workspaceId}`}
              className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline"
            >
              Open <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
        <ListPagination
          offset={offset}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setOffset}
          testId="messages-list-pagination"
        />
      </div>
    </div>
  );
}
