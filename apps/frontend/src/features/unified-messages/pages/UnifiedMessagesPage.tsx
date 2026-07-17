import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Archive, User } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import {
  useConversation,
  useConversationFiltersFromUrl,
  useConversationMessages,
  useConversations,
  useMarkRead,
  useSendInternalNote,
  useSendMessage,
} from "../hooks/useConversations";
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
      <div className="flex items-center gap-2 mt-1">
        <ChannelBadge channel={item.primaryChannel} />
        {item.contexts[0] && (
          <span className="text-xs text-muted-foreground">{item.contexts[0].contextType}</span>
        )}
      </div>
      {item.lastMessagePreview && (
        <p className="text-xs text-muted-foreground truncate mt-1">{item.lastMessagePreview}</p>
      )}
    </button>
  );
}

function MessageComposer({
  conversationId,
  canInternalNote,
  hasWhatsApp,
}: {
  conversationId: string;
  canInternalNote: boolean;
  hasWhatsApp: boolean;
}) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"WORKSPACE" | "WHATSAPP">("WORKSPACE");
  const send = useSendMessage(conversationId);
  const note = useSendInternalNote(conversationId);

  const onSubmit = async () => {
    if (!text.trim()) return;
    if (mode === "internal") {
      await note.mutateAsync(text.trim());
    } else {
      await send.mutateAsync({ text: text.trim(), channel });
    }
    setText("");
  };

  return (
    <div className="border-t p-3 space-y-2 bg-background">
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
        />
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm self-end"
          disabled={send.isPending || note.isPending}
          onClick={() => void onSubmit()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function UnifiedMessagesPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const filters = useConversationFiltersFromUrl();
  const conversationId = paramId ?? searchParams.get("conversationId") ?? undefined;

  const [search, setSearch] = useState(filters.search ?? "");
  const { data: list, isLoading: listLoading } = useConversations({ search: search || undefined });
  const { data: detail } = useConversation(conversationId);
  const { data: messages } = useConversationMessages(conversationId);
  const markRead = useMarkRead(conversationId ?? "");

  const canInternalNote = useMemo(
    () => user?.role && !["BUYER", "SUPPLIER"].includes(user.role),
    [user?.role],
  );

  useEffect(() => {
    if (conversationId) void markRead.mutate();
  }, [conversationId]);

  const selectConversation = (id: string) => {
    navigate(`/messages/${id}${window.location.search}`);
  };

  const filterLinks = [
    { label: "All", params: {} },
    { label: "Unread", params: { unread: "true" } },
    { label: "WhatsApp", params: { channel: "WHATSAPP" } },
    { label: "Workspace", params: { channel: "WORKSPACE" } },
    { label: "RFQ", params: { contextType: "RFQ" } },
    { label: "Freight", params: { contextType: "FREIGHT" } },
    { label: "Archived", params: { archived: "true" } },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Left column */}
      <aside className="w-full md:w-80 border-r flex flex-col shrink-0" data-testid="unified-messages-list">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const next = new URLSearchParams(searchParams);
                  if (search) next.set("q", search);
                  else next.delete("q");
                  setSearchParams(next);
                }
              }}
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
        <div className="flex-1 overflow-y-auto">
          {listLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {list?.items.map((item: UnifiedConversationSummary) => (
            <ConversationListItem
              key={item.id}
              item={item}
              active={item.id === conversationId}
              onSelect={() => selectConversation(item.id)}
            />
          ))}
          {!listLoading && !list?.items.length && (
            <p className="p-4 text-sm text-muted-foreground">No conversations</p>
          )}
        </div>
      </aside>

      {/* Center column */}
      <main className="flex-1 flex flex-col min-w-0">
        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="border-b px-4 py-3">
              <h2 className="font-medium">{detail?.subject ?? "Conversation"}</h2>
              <p className="text-xs text-muted-foreground">
                {detail?.participants.map((p: UnifiedConversationSummary["participants"][number]) => p.displayName ?? p.participantKey).join(", ")}
              </p>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages?.items.map((m: UnifiedMessageDto) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                    m.audienceScope === "INTERNAL"
                      ? "bg-amber-50 border border-amber-200 ml-auto"
                      : m.direction === "OUTBOUND"
                        ? "bg-primary/10 ml-auto"
                        : "bg-muted"
                  }`}
                >
                  <p>{m.body}</p>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <ChannelBadge channel={m.channel} />
                    {m.sentAt && <span>sent</span>}
                    {m.deliveredAt && <span>delivered</span>}
                    {m.readAt && <span>read</span>}
                  </div>
                </div>
              ))}
            </div>
            <MessageComposer
              conversationId={conversationId}
              canInternalNote={Boolean(canInternalNote)}
              hasWhatsApp={detail?.primaryChannel === "WHATSAPP"}
            />
          </>
        )}
      </main>

      {/* Right column — desktop only */}
      <aside className="hidden lg:block w-72 border-l p-4 space-y-4 overflow-y-auto">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <User className="h-4 w-4" /> Context
          </h3>
          {detail?.contexts.map((c: UnifiedConversationSummary["contexts"][number]) => (
            <div key={c.id} className="mt-2 text-sm">
              <div className="font-medium">{c.contextType}</div>
              <div className="text-muted-foreground truncate">{c.contextId}</div>
            </div>
          ))}
        </div>
        {detail?.assignedUserId && (
          <div className="text-sm">
            <span className="text-muted-foreground">Assigned: </span>
            {detail.assignedUserId}
          </div>
        )}
        <button type="button" className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <Archive className="h-4 w-4" /> Archive
        </button>
      </aside>
    </div>
  );
}
