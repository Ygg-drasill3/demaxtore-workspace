import type { UnifiedMessageDto } from "@dmx/contracts/unified-messaging";
import { AlertCircle, FileText, Lock, MessageSquare, RefreshCw, StickyNote } from "lucide-react";

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function channelStyles(msg: UnifiedMessageDto) {
  if (msg.messageType === "INTERNAL_NOTE" || msg.audienceScope === "INTERNAL") {
    return { bg: "bg-amber-50 border-amber-100", icon: StickyNote, label: "Internal" };
  }
  if (msg.messageType === "SYSTEM_EVENT" || msg.audienceScope === "SYSTEM") {
    return { bg: "bg-zinc-100 border-zinc-200", icon: AlertCircle, label: "System" };
  }
  if (msg.channel === "WHATSAPP") {
    return { bg: "bg-emerald-50 border-emerald-100", icon: MessageSquare, label: "WhatsApp" };
  }
  return { bg: "bg-white border-zinc-200", icon: MessageSquare, label: "Workspace" };
}

function statusLabel(msg: UnifiedMessageDto) {
  if (msg.failedAt) return { text: "Failed", className: "text-red-600" };
  if (msg.readAt) return { text: "Read", className: "text-zinc-500" };
  if (msg.deliveredAt) return { text: "Delivered", className: "text-zinc-500" };
  if (msg.sentAt) return { text: "Sent", className: "text-zinc-400" };
  return { text: "Pending", className: "text-amber-600" };
}

export function PremiumMessageTimeline({
  messages,
  onReply,
  onRetry,
  timelineRef,
  onScroll,
}: {
  messages: UnifiedMessageDto[];
  onReply: (msg: UnifiedMessageDto) => void;
  onRetry?: (msg: UnifiedMessageDto) => void;
  timelineRef: React.Ref<HTMLDivElement>;
  onScroll: () => void;
}) {
  let lastDate = "";

  return (
    <div
      ref={timelineRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-[#fafafa]"
      data-testid="message-timeline"
      onScroll={onScroll}
    >
      {messages.map((msg) => {
        const dl = dateLabel(msg.createdAt);
        const showSep = dl !== lastDate;
        lastDate = dl;
        const ch = channelStyles(msg);
        const Icon = ch.icon;
        const st = statusLabel(msg);
        const outbound = msg.direction === "OUTBOUND";

        return (
          <div key={msg.id}>
            {showSep && (
              <div className="flex items-center gap-3 py-4" data-testid="date-separator">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{dl}</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>
            )}
            <div className={`flex ${outbound ? "justify-end" : "justify-start"} mb-3`}>
              <div
                className={`max-w-[min(520px,85%)] rounded-2xl border px-4 py-3 shadow-sm ${ch.bg} ${
                  outbound ? "rounded-br-md" : "rounded-bl-md"
                }`}
                data-testid={`message-bubble-${msg.id}`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{ch.label}</span>
                  {msg.audienceScope === "INTERNAL" && <Lock className="h-3 w-3 text-amber-600" />}
                </div>
                {msg.replyToMessageId && (
                  <div className="text-xs text-zinc-500 border-l-2 border-zinc-300 pl-2 mb-2 italic">Reply</div>
                )}
                <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">{msg.body}</p>
                <div className="flex items-center justify-between gap-3 mt-2 pt-1">
                  <span className={`text-[10px] ${st.className}`}>{st.text}</span>
                  <div className="flex items-center gap-2">
                    {msg.failedAt && onRetry && (
                      <button
                        type="button"
                        data-testid={`retry-message-${msg.id}`}
                        className="text-[10px] flex items-center gap-0.5 text-red-600 hover:underline"
                        onClick={() => onRetry(msg)}
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[10px] text-zinc-500 hover:text-zinc-800"
                      onClick={() => onReply(msg)}
                    >
                      Reply
                    </button>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm py-16">
          <FileText className="h-10 w-10 mb-3 opacity-30" />
          No messages yet — start the conversation
        </div>
      )}
    </div>
  );
}
