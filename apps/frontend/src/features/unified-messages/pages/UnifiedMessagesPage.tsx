import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Archive, User, ChevronLeft, PanelRight, X } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import {
  useConversation,
  useConversationFiltersFromUrl,
  useInfiniteConversations,
  useInfiniteMessages,
  useMarkRead,
  useSendInternalNote,
  useSendMessage,
} from "../hooks/useConversations";
import { useMessagingSocket } from "../hooks/useMessagingSocket";
import { unifiedMessagesApi } from "../lib/unified-messages.api";
import type { UnifiedConversationSummary, UnifiedMessageDto } from "@dmx/contracts/unified-messaging";

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    WHATSAPP: "bg-green-100 text-green-800",
    WORKSPACE: "bg-blue-100 text-blue-800",
    SYSTEM: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[channel] ?? "bg-gray-100"}`}>
      {channel}
    </span>
  );
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ConversationListItem({
  item,
  active,
  onSelect,
}: {
  item: UnifiedConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`conversation-row-${item.id}`}
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 border-b hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate text-sm">
          {item.subject ?? item.contexts[0]?.contextReference ?? item.id.slice(0, 8)}
        </span>
        {item.unreadCount > 0 && (
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 min-w-[1.25rem] text-center">
            {item.unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <ChannelBadge channel={item.primaryChannel} />
        {item.contexts[0] && (
          <span className="text-xs text-muted-foreground">{item.contexts[0].contextType}</span>
        )}
        {item.priority && item.priority !== "NORMAL" && (
          <span className="text-xs text-orange-600">{item.priority}</span>
        )}
      </div>
      {item.lastMessagePreview && (
        <p className="text-xs text-muted-foreground truncate mt-1">{item.lastMessagePreview}</p>
      )}
    </button>
  );
}

function ContextPanel({
  detail,
  conversationId,
  onClose,
  mobile,
}: {
  detail?: UnifiedConversationSummary;
  conversationId: string;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const [assignId, setAssignId] = useState(detail?.assignedUserId ?? "");

  const onAssign = async () => {
    if (!assignId.trim()) return;
    await unifiedMessagesApi.assign(conversationId, assignId.trim());
  };

  const onArchive = async () => {
    await unifiedMessagesApi.archive(conversationId);
  };

  return (
    <div
      data-testid={mobile ? "mobile-context-drawer" : "context-panel"}
      className={mobile ? "fixed inset-0 z-50 bg-background flex flex-col" : "space-y-4"}
    >
      {mobile && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Context</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
      )}
      <div className={mobile ? "flex-1 overflow-y-auto p-4 space-y-4" : ""}>
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <User className="h-4 w-4" /> Participants
          </h3>
          <ul className="mt-2 text-sm space-y-1">
            {detail?.participants.map((p) => (
              <li key={p.id}>{p.displayName ?? p.participantKey}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Contexts</h3>
          {detail?.contexts.map((c) => (
            <div key={c.id} className="mt-2 text-sm">
              <div className="font-medium">{c.contextType}</div>
              <div className="text-muted-foreground truncate">{c.contextId}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Assign user ID</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
              data-testid="assign-user-input"
            />
            <button type="button" className="text-sm px-2 py-1 border rounded" onClick={() => void onAssign()}>
              Assign
            </button>
          </div>
        </div>
        <button
          type="button"
          className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground"
          data-testid="archive-conversation"
          onClick={() => void onArchive()}
        >
          <Archive className="h-4 w-4" /> Archive
        </button>
      </div>
    </div>
  );
}

function MessageComposer({
  conversationId,
  canInternalNote,
  hasWhatsApp,
  replyTo,
  onClearReply,
}: {
  conversationId: string;
  canInternalNote: boolean;
  hasWhatsApp: boolean;
  replyTo?: UnifiedMessageDto | null;
  onClearReply: () => void;
}) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"WORKSPACE" | "WHATSAPP">("WORKSPACE");
  const [optimistic, setOptimistic] = useState<UnifiedMessageDto[]>([]);
  const send = useSendMessage(conversationId);
  const note = useSendInternalNote(conversationId);

  const onSubmit = async () => {
    if (!text.trim()) return;
    const clientMessageId = crypto.randomUUID();
    const pending: UnifiedMessageDto = {
      id: `opt-${clientMessageId}`,
      conversationId,
      senderUserId: null,
      body: text.trim(),
      channel: mode === "internal" ? "WORKSPACE" : channel,
      audienceScope: mode === "internal" ? "INTERNAL" : "EXTERNAL",
      direction: "OUTBOUND",
      status: "PENDING",
      messageType: mode === "internal" ? "INTERNAL_NOTE" : "MESSAGE",
      createdAt: new Date().toISOString(),
      replyToMessageId: replyTo?.id ?? null,
      externalMessageId: null,
      whatsappMessageId: null,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    };
    setOptimistic((o) => [...o, pending]);
    const body = text.trim();
    setText("");
    onClearReply();
    try {
      if (mode === "internal") {
        await note.mutateAsync(body);
      } else {
        await send.mutateAsync({ text: body, channel, clientMessageId });
      }
      setOptimistic((o) => o.filter((m) => m.id !== pending.id));
    } catch {
      setOptimistic((o) => o.filter((m) => m.id !== pending.id));
    }
  };

  return (
    <div className="border-t p-3 space-y-2 bg-background" data-testid="message-composer">
      {replyTo && (
        <div className="text-xs bg-muted px-2 py-1 rounded flex justify-between">
          <span>Replying to: {replyTo.body.slice(0, 60)}</span>
          <button type="button" onClick={onClearReply}>×</button>
        </div>
      )}
      {canInternalNote && (
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={mode === "reply" ? "font-semibold" : "text-muted-foreground"}
            onClick={() => setMode("reply")}
          >
            Customer Reply
          </button>
          <button
            type="button"
            className={mode === "internal" ? "font-semibold text-amber-700" : "text-muted-foreground"}
            onClick={() => setMode("internal")}
          >
            Internal Note
          </button>
        </div>
      )}
      {mode === "internal" && (
        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
          Customers cannot see internal notes.
        </p>
      )}
      {mode === "reply" && hasWhatsApp && (
        <select
          className="text-sm border rounded px-2 py-1"
          value={channel}
          onChange={(e) => setChannel(e.target.value as "WORKSPACE" | "WHATSAPP")}
        >
          <option value="WORKSPACE">Workspace</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      )}
      <div className="flex gap-2">
        <textarea
          className="flex-1 border rounded px-3 py-2 text-sm min-h-[60px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "internal" ? "Internal note…" : "Type a message…"}
          data-testid="composer-input"
        />
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm self-end"
          disabled={send.isPending || note.isPending}
          data-testid="composer-send"
          onClick={() => void onSubmit()}
        >
          Send
        </button>
      </div>
      {/* optimistic messages rendered by parent via callback if needed */}
      <span data-testid="optimistic-count" className="sr-only">{optimistic.length}</span>
    </div>
  );
}

export default function UnifiedMessagesPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const filters = useConversationFiltersFromUrl();
  const conversationId = paramId ?? searchParams.get("conversationId") ?? undefined;

  const [search, setSearch] = useState(filters.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [mobileView, setMobileView] = useState<"list" | "timeline" | "context">("list");
  const [replyTo, setReplyTo] = useState<UnifiedMessageDto | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useInfiniteConversations({ search: debouncedSearch || undefined });
  const messagesQuery = useInfiniteMessages(conversationId);
  const { data: detail } = useConversation(conversationId);
  const markRead = useMarkRead(conversationId ?? "");
  useMessagingSocket(conversationId);

  const conversations = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listQuery.data],
  );

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flatMap((p) => p.items);
  }, [messagesQuery.data]);

  const canInternalNote = useMemo(
    () => user?.role && !["BUYER", "SUPPLIER"].includes(user.role),
    [user?.role],
  );

  useEffect(() => {
    if (conversationId) void markRead.mutate();
  }, [conversationId]);

  const selectConversation = (id: string) => {
    navigate(`/messages/${id}${window.location.search}`);
    setMobileView("timeline");
  };

  const onListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      void listQuery.fetchNextPage();
    }
  }, [listQuery]);

  const onTimelineScroll = useCallback(() => {
    const el = timelineRef.current;
    if (!el || !messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
    if (el.scrollTop < 40) {
      void messagesQuery.fetchNextPage();
    }
  }, [messagesQuery]);

  const filterLinks = [
    { label: "All", params: {} },
    { label: "Unread", params: { unread: "true" } },
    { label: "WhatsApp", params: { channel: "WHATSAPP" } },
    { label: "Workspace", params: { channel: "WORKSPACE" } },
    { label: "RFQ", params: { contextType: "RFQ" } },
    { label: "Freight", params: { contextType: "FREIGHT" } },
    { label: "Archived", params: { archived: "true" } },
  ];

  const showList = !conversationId || mobileView === "list";
  const showTimeline = conversationId && (mobileView === "timeline" || window.innerWidth >= 768);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row" data-testid="unified-messages-page">
      <aside
        className={`w-full md:w-80 border-r flex flex-col shrink-0 ${showList ? "flex" : "hidden md:flex"}`}
        data-testid="unified-messages-list"
      >
        <div className="p-3 border-b">
          <h1 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Messages
          </h1>
          <div className="mt-2 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border rounded"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="conversation-search"
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {filterLinks.map((f) => (
              <Link
                key={f.label}
                to={`/messages?${new URLSearchParams(f.params as Record<string, string>).toString()}`}
                className="text-xs px-2 py-1 rounded border hover:bg-muted"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          onScroll={onListScroll}
        >
          {listQuery.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {listQuery.isError && (
            <button type="button" className="p-4 text-sm text-red-600" onClick={() => void listQuery.refetch()}>
              Error — retry
            </button>
          )}
          {conversations.map((item) => (
            <ConversationListItem
              key={item.id}
              item={item}
              active={item.id === conversationId}
              onSelect={() => selectConversation(item.id)}
            />
          ))}
          {listQuery.isFetchingNextPage && (
            <p className="p-2 text-xs text-center text-muted-foreground">Loading more…</p>
          )}
          {!listQuery.isLoading && !conversations.length && (
            <p className="p-4 text-sm text-muted-foreground">No conversations</p>
          )}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 ${showTimeline ? "flex" : "hidden md:flex"}`}>
        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="border-b px-4 py-3 flex items-center gap-2">
              <button
                type="button"
                className="md:hidden"
                onClick={() => setMobileView("list")}
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium truncate">{detail?.subject ?? "Conversation"}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {detail?.participants.map((p) => p.displayName ?? p.participantKey).join(", ")}
                </p>
              </div>
              <button
                type="button"
                className="lg:hidden"
                onClick={() => setMobileView("context")}
                aria-label="Context"
              >
                <PanelRight className="h-5 w-5" />
              </button>
            </header>
            <div
              ref={timelineRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
              data-testid="message-timeline"
              onScroll={onTimelineScroll}
            >
              {messagesQuery.isFetchingNextPage && (
                <p className="text-xs text-center text-muted-foreground">Loading older messages…</p>
              )}
              {messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showDate =
                  !prev || dateLabel(prev.createdAt) !== dateLabel(m.createdAt);
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="text-center text-xs text-muted-foreground my-2">{dateLabel(m.createdAt)}</div>
                    )}
                    <div
                      className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                        m.audienceScope === "INTERNAL"
                          ? "bg-amber-50 border border-amber-200 ml-auto"
                          : m.audienceScope === "SYSTEM"
                            ? "bg-gray-100 mx-auto text-center text-xs"
                            : m.direction === "OUTBOUND"
                              ? "bg-primary/10 ml-auto"
                              : "bg-muted"
                      }`}
                      data-testid={`message-${m.id}`}
                    >
                      {m.replyToMessageId && (
                        <p className="text-xs text-muted-foreground border-l-2 pl-2 mb-1">Reply</p>
                      )}
                      <p>{m.body}</p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <ChannelBadge channel={m.channel} />
                        {m.sentAt && <span>sent</span>}
                        {m.deliveredAt && <span>delivered</span>}
                        {m.readAt && <span>read</span>}
                        {m.failedAt && <span className="text-red-600">failed</span>}
                        {canInternalNote && (
                          <button type="button" className="underline" onClick={() => setReplyTo(m)}>
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <MessageComposer
              conversationId={conversationId}
              canInternalNote={Boolean(canInternalNote)}
              hasWhatsApp={detail?.primaryChannel === "WHATSAPP"}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
            />
          </>
        )}
      </main>

      <aside className="hidden lg:block w-72 border-l p-4 overflow-y-auto">
        {conversationId && detail && (
          <ContextPanel detail={detail} conversationId={conversationId} />
        )}
      </aside>

      {mobileView === "context" && conversationId && detail && (
        <ContextPanel
          detail={detail}
          conversationId={conversationId}
          mobile
          onClose={() => setMobileView("timeline")}
        />
      )}
    </div>
  );
}
