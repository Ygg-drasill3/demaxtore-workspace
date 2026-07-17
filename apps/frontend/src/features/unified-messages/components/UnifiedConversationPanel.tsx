import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageSquare } from "lucide-react";
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

function resolveDeliveryStatus(m: { status: string; sentAt?: string | null; deliveredAt?: string | null; readAt?: string | null; failedAt?: string | null }) {
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
    READ: "text-green-600",
    FAILED: "text-red-500",
  };
  if (!status || status === "PENDING") return null;
  return <span className={`text-[10px] ${colors[status] ?? ""}`}>{status.toLowerCase()}</span>;
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
  const [channel, setChannel] = useState<"WORKSPACE" | "WHATSAPP">(
    allowedChannels.includes("WORKSPACE") ? "WORKSPACE" : "WHATSAPP",
  );

  return (
    <div className="border-t p-2 bg-background space-y-1">
      {canInternal && (
        <div className="flex gap-2 text-xs">
          <button type="button" className={mode === "reply" ? "font-semibold" : "text-muted-foreground"} onClick={() => setMode("reply")}>
            Reply
          </button>
          <button type="button" className={mode === "internal" ? "font-semibold text-amber-700" : "text-muted-foreground"} onClick={() => setMode("internal")}>
            Internal note
          </button>
        </div>
      )}
      {mode === "reply" && hasWhatsApp && allowedChannels.includes("WHATSAPP") && (
        <select className="text-xs border rounded px-1 py-0.5" value={channel} onChange={(e) => setChannel(e.target.value as "WORKSPACE" | "WHATSAPP")}>
          <option value="WORKSPACE">Workspace</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1.5 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "internal" ? "Internal note…" : "Type a message…"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(text, mode, channel);
              setText("");
            }
          }}
        />
        <button
          type="button"
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm"
          disabled={pending}
          onClick={() => {
            onSend(text, mode, channel);
            setText("");
          }}
        >
          Send
        </button>
      </div>
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

  return (
    <div data-testid={testId} className={`dmx-card overflow-hidden ${compact ? "" : "mt-4"}`}>
      <div className="border-b border-paper-200 bg-[#f0f2f5] px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-ink-900 text-sm">Messages</h2>
          <p className="text-xs text-zinc-500">{contextType} · {contextId.slice(0, 8)}</p>
        </div>
        <Link
          to={messagesLink}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
          data-testid={`${testId}-open-in-messages`}
        >
          Open in Messages <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className={`flex flex-col ${compact ? "max-h-[320px]" : "min-h-[280px]"}`}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
          {messagesLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded w-2/3" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
          ) : (
            visibleMessages.map((m) => (
              <div
                key={m.id}
                className={`text-sm rounded px-3 py-2 max-w-[85%] ${
                  m.audienceScope === "INTERNAL"
                    ? "bg-amber-50 border border-amber-200 ml-auto"
                    : "bg-zinc-100"
                }`}
              >
                {m.audienceScope === "INTERNAL" && (
                  <span className="text-[10px] text-amber-700 font-medium block mb-1">Internal</span>
                )}
                <p>{m.body}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <StatusDot status={resolveDeliveryStatus(m)} />
                </div>
              </div>
            ))
          )}
        </div>

        <PanelComposer
          canInternal={canInternal}
          allowedChannels={allowedChannels}
          hasWhatsApp={detail?.primaryChannel === "WHATSAPP"}
          onSend={(text, mode, channel) => {
            if (!text.trim() || !conversationId) return;
            if (mode === "internal") void note.mutateAsync(text.trim());
            else void send.mutateAsync({ text: text.trim(), channel, clientMessageId: crypto.randomUUID() });
          }}
          pending={send.isPending || note.isPending}
        />
      </div>
    </div>
  );
}
