import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import type { ConversationContextType } from "@dmx/contracts/unified-messaging";
import {
  useConversation,
  useConversationMessages,
  useConversations,
  useMarkRead,
  useSendInternalNote,
  useSendMessage,
} from "../hooks/useConversations";
import { useMessagingSocket } from "../hooks/useMessagingSocket";

export type UnifiedConversationPanelProps = {
  contextType: ConversationContextType;
  contextId: string;
  workspaceType?: string;
  workspaceId?: string;
  compact?: boolean;
  allowInternalNote?: boolean;
  allowedChannels?: Array<"WORKSPACE" | "WHATSAPP">;
  showContextPanel?: boolean;
  defaultConversationId?: string;
  testId?: string;
};

function resolveDeliveryStatus(m: {
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
}) {
  if (m.failedAt) return "FAILED";
  if (m.readAt) return "READ";
  if (m.deliveredAt) return "DELIVERED";
  if (m.sentAt) return "SENT";
  return m.status?.toUpperCase();
}

function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    SENT: "text-zinc-400",
    DELIVERED: "text-blue-500",
    READ: "text-emerald-600",
    FAILED: "text-red-500",
  };
  if (!status || status === "PENDING") return null;
  return <span className={`text-[10px] font-medium ${colors[status] ?? "text-zinc-400"}`}>{status.toLowerCase()}</span>;
}

function PanelComposer({
  canInternal,
  allowedChannels,
  hasWhatsApp,
  onSend,
  pending,
}: {
  canInternal: boolean;
  allowedChannels: Array<"WORKSPACE" | "WHATSAPP">;
  hasWhatsApp: boolean;
  onSend: (text: string, mode: "reply" | "internal", channel: "WORKSPACE" | "WHATSAPP") => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"WORKSPACE" | "WHATSAPP">("WORKSPACE");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!text.trim() || pending) return;
    onSend(text, mode, channel);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="border-t border-paper-200 bg-white px-4 py-3 space-y-2.5">
      {canInternal && (
        <div className="flex gap-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === "reply"
                ? "bg-accent-900 text-white"
                : "text-zinc-500 hover:bg-paper-100 hover:text-ink-900"
            }`}
            onClick={() => setMode("reply")}
          >
            Reply
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === "internal"
                ? "bg-amber-600 text-white"
                : "text-zinc-500 hover:bg-amber-50 hover:text-amber-800"
            }`}
            onClick={() => setMode("internal")}
          >
            Internal note
          </button>
        </div>
      )}
      {mode === "reply" && hasWhatsApp && allowedChannels.includes("WHATSAPP") && (
        <select
          className="text-xs border border-paper-200 rounded-lg px-2.5 py-1.5 bg-paper-50 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-900/15"
          value={channel}
          onChange={(e) => setChannel(e.target.value as "WORKSPACE" | "WHATSAPP")}
        >
          <option value="WORKSPACE">Workspace</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      )}
      <div className="flex items-end gap-2.5">
        <textarea
          ref={textareaRef}
          rows={3}
          className="flex-1 min-h-[88px] max-h-[200px] resize-y rounded-xl border border-paper-200 bg-paper-50/80 px-3.5 py-3 text-sm leading-relaxed text-ink-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent-900/15 focus:border-accent-900/30 focus:bg-white transition"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
          }}
          placeholder={mode === "internal" ? "Write an internal note…" : "Type your message…"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-accent-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-accent-800 disabled:opacity-50 transition"
          disabled={pending || !text.trim()}
          onClick={submit}
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
      <p className="text-[10px] text-zinc-400">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}

export function UnifiedConversationPanel({
  contextType,
  contextId,
  compact = false,
  allowInternalNote,
  allowedChannels = ["WORKSPACE", "WHATSAPP"],
  defaultConversationId,
  testId = "unified-conversation-panel",
}: UnifiedConversationPanelProps) {
  const user = useAuth((s) => s.user);
  const { data: list, isLoading, isError } = useConversations({ contextType, contextId, limit: 5 });
  const conversationId = defaultConversationId ?? list?.items[0]?.id;
  const { data: detail } = useConversation(conversationId);
  const { data: messages, isLoading: messagesLoading } = useConversationMessages(conversationId);
  const markRead = useMarkRead(conversationId ?? "");
  const send = useSendMessage(conversationId ?? "");
  const note = useSendInternalNote(conversationId ?? "");
  const timelineRef = useRef<HTMLDivElement>(null);
  useMessagingSocket(conversationId);

  const canInternal =
    allowInternalNote ??
    Boolean(user?.role && !["BUYER", "SUPPLIER"].includes(user.role));

  const messagesLink = `/messages?contextType=${contextType}&contextId=${contextId}${
    conversationId ? `&conversationId=${conversationId}` : ""
  }`;

  useEffect(() => {
    if (conversationId) void markRead.mutate();
  }, [conversationId]);

  const visibleMessages = useMemo(() => {
    const items = messages?.items ?? [];
    if (user?.role === "BUYER" || user?.role === "SUPPLIER") {
      return items.filter((m) => m.audienceScope === "EXTERNAL");
    }
    return items;
  }, [messages?.items, user?.role]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el || visibleMessages.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length, conversationId]);

  if (isLoading) {
    return (
      <div data-testid={testId} className="dmx-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid={testId} className="dmx-card p-4 text-sm text-red-600">
        Messages could not be loaded.
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div data-testid={testId} className="dmx-card p-4 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4 inline mr-2" />
        No conversation for this context yet.
        <Link to={messagesLink} className="ml-2 text-primary underline inline-flex items-center gap-1">
          Open in Messages <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const rfqRef =
    detail?.contexts?.find((c) => c.contextType === "RFQ")?.contextReference ??
    detail?.subject ??
    `${contextType} · ${contextId.slice(0, 8)}`;

  return (
    <div data-testid={testId} className={`dmx-card overflow-hidden flex flex-col ${compact ? "" : "mt-4"}`}>
      <div className="border-b border-paper-200 bg-gradient-to-b from-paper-50 to-white px-5 py-3.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink-950">Messages</h2>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{rfqRef}</p>
        </div>
        <Link
          to={messagesLink}
          className="text-xs font-medium text-accent-900 flex items-center gap-1 hover:underline shrink-0"
          data-testid={`${testId}-open-in-messages`}
        >
          Open in Messages <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className={`flex flex-col ${compact ? "h-[560px]" : "min-h-[640px] h-[min(72vh,820px)]"}`}>
        <div
          ref={timelineRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f7f8fa] dmx-thin-scroll min-h-0"
        >
          {messagesLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-white rounded-2xl w-3/4" />
              <div className="h-14 bg-white rounded-2xl w-2/3 ml-auto" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">No messages yet. Start the conversation below.</p>
          ) : (
            visibleMessages.map((m) => {
              const isOwn =
                m.audienceScope === "INTERNAL"
                  ? Boolean(user?.id && m.senderUserId === user.id)
                  : user?.id && m.senderUserId
                    ? m.senderUserId === user.id
                    : m.direction === "OUTBOUND";
              return (
                <div
                  key={m.id}
                  className={`text-sm rounded-2xl px-4 py-3 max-w-[min(92%,36rem)] shadow-sm ${
                    m.audienceScope === "INTERNAL"
                      ? "bg-amber-50 border border-amber-200/80 ml-auto"
                      : isOwn
                        ? m.channel === "WHATSAPP"
                          ? "bg-emerald-600 text-white ml-auto"
                          : "bg-sky-100 border border-sky-200/80 text-ink-900 ml-auto"
                        : "bg-white border border-paper-200 text-ink-900 mr-auto"
                  }`}
                >
                  {m.audienceScope === "INTERNAL" && (
                    <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide block mb-1.5">
                      Internal
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px] sm:text-sm">{m.body}</p>
                  <div
                    className={`flex items-center gap-2 mt-2 ${
                      isOwn && m.channel === "WHATSAPP" ? "text-emerald-100/90" : "text-zinc-400"
                    }`}
                  >
                    <span className="text-[10px]">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                    <StatusDot status={resolveDeliveryStatus(m)} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <PanelComposer
          canInternal={canInternal}
          allowedChannels={user?.role === "SUPPLIER" ? ["WORKSPACE"] : allowedChannels}
          hasWhatsApp={
            user?.role !== "SUPPLIER" &&
            (detail?.primaryChannel === "WHATSAPP" ||
              Boolean(detail?.contexts?.some((c) => c.contextType === "RFQ")))
          }
          onSend={(text, mode, channel) => {
            if (!text.trim() || !conversationId) return;
            const outboundChannel = user?.role === "SUPPLIER" ? "WORKSPACE" : channel;
            if (mode === "internal") void note.mutateAsync(text.trim());
            else void send.mutateAsync({ text: text.trim(), channel: outboundChannel, clientMessageId: crypto.randomUUID() });
          }}
          pending={send.isPending || note.isPending}
        />
      </div>
    </div>
  );
}
