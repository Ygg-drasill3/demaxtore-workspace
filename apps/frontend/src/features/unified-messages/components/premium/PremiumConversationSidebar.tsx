import type { UnifiedConversationSummary } from "@dmx/contracts/unified-messaging";
import {
  Building2,
  Clock,
  MessageCircle,
  Package,
  Search,
  Ship,
  ShoppingCart,
  Truck,
} from "lucide-react";

function contextIcon(type?: string) {
  if (type === "RFQ") return ShoppingCart;
  if (type === "ORDER") return Package;
  if (type === "FREIGHT") return Ship;
  return Building2;
}

/** Deterministic premium gradient per conversation, keyed by context type. */
function avatarGradient(type?: string) {
  switch (type) {
    case "RFQ":
      return "from-accent-600 to-accent-900";
    case "ORDER":
      return "from-amber-500 to-orange-700";
    case "FREIGHT":
      return "from-sky-500 to-blue-800";
    default:
      return "from-ink-800 to-ink-950";
  }
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
  onSelect,
  onScroll,
  listRef,
  isLoading,
}: {
  items: UnifiedConversationSummary[];
  activeId?: string;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: string) => void;
  onScroll: () => void;
  listRef: React.Ref<HTMLDivElement>;
  isLoading?: boolean;
}) {
  return (
    <aside
      className="w-full md:w-[326px] lg:w-[372px] border-r border-paper-200 bg-white/95 backdrop-blur-sm flex flex-col shrink-0"
      data-testid="unified-messages-list" data-guide="messages-list"
    >
      <div className="px-5 pt-6 pb-4 border-b border-paper-100 bg-gradient-to-b from-white to-paper-50/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink-950">Messages</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Workspace threads — RFQ, order & shipment</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15">
            <MessageCircle className="h-[18px] w-[18px]" />
          </span>
        </div>
        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full rounded-xl border border-paper-200 bg-paper-50/80 pl-10 pr-4 py-2.5 text-sm text-ink-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-900/15 focus:border-accent-900/30 focus:bg-white transition"
            placeholder="Search by RFQ or supplier…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            data-testid="conversation-search"
            data-guide="messages-filters"
          />
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto dmx-thin-scroll" onScroll={onScroll}>
        {isLoading && (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-11 w-11 rounded-2xl bg-paper-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-2/3 rounded bg-paper-100" />
                  <div className="h-2.5 w-4/5 rounded bg-paper-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        {items.map((item) => {
          const Icon = contextIcon(item.contexts[0]?.contextType);
          const rfqRef = item.contexts[0]?.contextReference ?? null;
          const title = item.subject ?? rfqRef ?? "Conversation";
          const supplierName =
            item.participants?.find((p) => p.participantRole !== "OWNER")?.displayName ?? null;
          const active = item.id === activeId;
          const unread = item.unreadCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`conversation-row-${item.id}`}
              onClick={() => onSelect(item.id)}
              className={`group relative w-full text-left px-4 py-3.5 border-b border-paper-100 transition-colors ${
                active ? "bg-accent-50/50" : "hover:bg-paper-50"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-900 transition-all ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                }`}
              />
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  <div
                    className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarGradient(
                      item.contexts[0]?.contextType,
                    )} flex items-center justify-center text-white shadow-sm ring-1 ring-black/5`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`truncate text-sm ${
                        unread ? "font-semibold text-ink-950" : "font-medium text-ink-900"
                      }`}
                    >
                      {title}
                    </span>
                    <span className={`text-[11px] shrink-0 ${unread ? "text-accent-900 font-medium" : "text-zinc-400"}`}>
                      {formatTime(item.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {rfqRef && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-accent-50 text-accent-900">
                        {rfqRef}
                      </span>
                    )}
                    {supplierName && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-paper-100 text-zinc-600 truncate max-w-[140px]">
                        {supplierName}
                      </span>
                    )}
                  </div>
                  {item.lastMessagePreview && (
                    <p
                      className={`text-xs truncate mt-1.5 leading-relaxed ${
                        unread ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      {item.lastMessagePreview}
                    </p>
                  )}
                </div>
                {unread && (
                  <span className="self-center text-[11px] font-semibold bg-accent-900 text-white rounded-full min-w-[1.35rem] h-[1.35rem] flex items-center justify-center px-1.5 shadow-sm">
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {!isLoading && items.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-paper-100">
              <MessageCircle className="h-7 w-7 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-ink-900">No conversations yet</p>
            <p className="text-xs text-zinc-500 mt-1">New threads will appear here.</p>
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
  const Icon = contextIcon(detail.contexts[0]?.contextType);
  return (
    <header
      className="px-6 py-4 border-b border-paper-100 bg-white/75 backdrop-blur-md sticky top-0 z-10"
      data-testid="conversation-header"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarGradient(
              detail.contexts[0]?.contextType,
            )} flex items-center justify-center text-white shadow-sm ring-1 ring-black/5 shrink-0`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink-950 truncate">{title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                WhatsApp
              </span>
              {detail.contexts[0]?.contextReference && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-50 text-accent-900 font-medium">
                  {detail.contexts[0].contextReference}
                </span>
              )}
              {detail.assignedUserId && (
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Assigned rep
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="h-3.5 w-3.5" />
            Last activity
          </div>
          <div className="mt-0.5 font-medium text-ink-800">{formatTime(detail.lastMessageAt) || "—"}</div>
          {detail.primaryChannel === "WHATSAPP" && (
            <div className="mt-1 inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> WhatsApp active
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
