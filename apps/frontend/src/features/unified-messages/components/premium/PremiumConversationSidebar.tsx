import type { UnifiedConversationSummary } from "@dmx/contracts/unified-messaging";
import {
  Building2,
  Clock,
  MessageCircle,
  Package,
  Ship,
  ShoppingCart,
  Truck,
} from "lucide-react";

const FILTER_CHIPS = [
  { label: "All", params: {} },
  { label: "Unread", params: { unread: "true" } },
  { label: "RFQ", params: { contextType: "RFQ" } },
  { label: "Orders", params: { contextType: "ORDER" } },
  { label: "Freight", params: { contextType: "FREIGHT" } },
  { label: "WhatsApp", params: { channel: "WHATSAPP" } },
] as const;

function contextIcon(type?: string) {
  if (type === "RFQ") return ShoppingCart;
  if (type === "ORDER") return Package;
  if (type === "FREIGHT") return Ship;
  return Building2;
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PremiumConversationSidebar({
  items,
  activeId,
  search,
  onSearch,
  filterParams,
  onSelect,
  onScroll,
  listRef,
  isLoading,
}: {
  items: UnifiedConversationSummary[];
  activeId?: string;
  search: string;
  onSearch: (v: string) => void;
  filterParams: URLSearchParams;
  onSelect: (id: string) => void;
  onScroll: () => void;
  listRef: React.Ref<HTMLDivElement>;
  isLoading?: boolean;
}) {
  return (
    <aside
      className="w-full md:w-[320px] lg:w-[360px] border-r border-zinc-200/80 bg-white flex flex-col shrink-0"
      data-testid="unified-messages-list"
    >
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Messages</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Workspace conversations</p>
        <div className="mt-4 relative">
          <input
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/8 focus:bg-white transition"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            data-testid="conversation-search"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {FILTER_CHIPS.map((f) => {
            const qs = new URLSearchParams(f.params as Record<string, string>).toString();
            const active =
              [...filterParams.entries()].every(([k, v]) => (f.params as Record<string, string>)[k] === v) &&
              Object.keys(f.params).length === [...filterParams.keys()].filter((k) => k !== "q").length;
            return (
              <a
                key={f.label}
                href={`/messages${qs ? `?${qs}` : ""}`}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  active
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {f.label}
              </a>
            );
          })}
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={onScroll}>
        {isLoading && <p className="p-5 text-sm text-zinc-500">Loading…</p>}
        {items.map((item) => {
          const Icon = contextIcon(item.contexts[0]?.contextType);
          const title = item.subject ?? item.contexts[0]?.contextReference ?? "Conversation";
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`conversation-row-${item.id}`}
              onClick={() => onSelect(item.id)}
              className={`w-full text-left px-5 py-4 border-b border-zinc-100 transition hover:bg-zinc-50/80 ${
                active ? "bg-zinc-50 border-l-2 border-l-zinc-900" : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-zinc-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-zinc-900 truncate">{title}</span>
                    <span className="text-[11px] text-zinc-400 shrink-0">{formatTime(item.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.primaryChannel === "WHATSAPP" ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">WA</span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">WS</span>
                    )}
                    {item.priority && item.priority !== "NORMAL" && (
                      <span className="text-[10px] font-medium text-orange-600">{item.priority}</span>
                    )}
                    {item.status && item.status !== "ACTIVE" && (
                      <span className="text-[10px] text-zinc-500">{item.status}</span>
                    )}
                  </div>
                  {item.lastMessagePreview && (
                    <p className="text-xs text-zinc-500 truncate mt-1.5 leading-relaxed">{item.lastMessagePreview}</p>
                  )}
                </div>
                {item.unreadCount > 0 && (
                  <span className="text-[11px] font-semibold bg-zinc-900 text-white rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5">
                    {item.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {!isLoading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No conversations yet
          </div>
        )}
      </div>
    </aside>
  );
}

export function PremiumConversationHeader({
  detail,
}: {
  detail?: UnifiedConversationSummary;
}) {
  if (!detail) return null;
  const title = detail.subject ?? detail.contexts[0]?.contextReference ?? "Conversation";
  return (
    <header
      className="px-6 py-4 border-b border-zinc-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10"
      data-testid="conversation-header"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">B2B Workspace</span>
            {detail.assignedUserId && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Assigned rep
              </span>
            )}
            {detail.contexts[0] && (
              <span className="text-xs text-zinc-500">{detail.contexts[0].contextType}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="h-3.5 w-3.5" />
            Last activity
          </div>
          <div className="mt-0.5 font-medium text-zinc-700">{formatTime(detail.lastMessageAt) || "—"}</div>
          {detail.primaryChannel === "WHATSAPP" && (
            <div className="mt-1 text-emerald-600 font-medium">WhatsApp session active</div>
          )}
        </div>
      </div>
    </header>
  );
}
