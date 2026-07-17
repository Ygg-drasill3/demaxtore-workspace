import { useRef, useState } from "react";
import { Paperclip, Send, Smile, StickyNote, X } from "lucide-react";
import type { UnifiedMessageDto } from "@dmx/contracts/unified-messaging";
import { useSendInternalNote, useSendMessage } from "../../hooks/useConversations";
import { unifiedMessagesApi } from "../../lib/unified-messages.api";

export function PremiumMessageComposer({
  conversationId,
  canInternalNote,
  hasWhatsApp,
  replyTo,
  onClearReply,
  disabled,
}: {
  conversationId: string;
  canInternalNote: boolean;
  hasWhatsApp: boolean;
  replyTo?: UnifiedMessageDto | null;
  onClearReply: () => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<"WORKSPACE" | "WHATSAPP">("WORKSPACE");
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const send = useSendMessage(conversationId);
  const note = useSendInternalNote(conversationId);

  const onSubmit = async () => {
    const body = text.trim();
    if (!body) return;
    if (mode === "internal") {
      await note.mutateAsync(body);
    } else {
      await send.mutateAsync({
        text: body,
        channel: hasWhatsApp ? channel : "WORKSPACE",
        clientMessageId: crypto.randomUUID(),
      });
    }
    setText("");
    onClearReply();
  };

  if (disabled) return null;

  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-4" data-testid="message-composer">
      {hasWhatsApp && channel === "WHATSAPP" && (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900" data-testid="whatsapp-window-warning">
          24-hour WhatsApp customer service window applies. Use templates outside the window.
        </div>
      )}
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs">
          <span className="text-zinc-600 truncate">Replying to: {replyTo.body.slice(0, 80)}</span>
          <button type="button" onClick={onClearReply} aria-label="Clear reply">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className={`text-xs px-2.5 py-1 rounded-full ${mode === "reply" ? "bg-zinc-900 text-white" : "text-zinc-600 border border-zinc-200"}`}
          onClick={() => setMode("reply")}
        >
          Message
        </button>
        {canInternalNote && (
          <button
            type="button"
            className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${mode === "internal" ? "bg-amber-600 text-white" : "text-zinc-600 border border-zinc-200"}`}
            onClick={() => setMode("internal")}
          >
            <StickyNote className="h-3 w-3" /> Internal
          </button>
        )}
        {hasWhatsApp && mode === "reply" && (
          <select
            className="ml-auto text-xs border border-zinc-200 rounded-lg px-2 py-1"
            value={channel}
            onChange={(e) => setChannel(e.target.value as "WORKSPACE" | "WHATSAPP")}
            data-testid="channel-select"
          >
            <option value="WORKSPACE">Workspace</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        )}
      </div>
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-2 focus-within:ring-2 focus-within:ring-zinc-900/8 focus-within:bg-white transition">
        <button type="button" className="p-2 text-zinc-400 hover:text-zinc-600" aria-label="Emoji">
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="p-2 text-zinc-400 hover:text-zinc-600"
          onClick={() => fileRef.current?.click()}
          data-testid="attach-button"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void unifiedMessagesApi.uploadAttachment(conversationId, f, setUploadPct);
        }} />
        <textarea
          data-testid="composer-input"
          className="flex-1 resize-none bg-transparent text-sm py-2 px-1 min-h-[44px] max-h-32 focus:outline-none"
          placeholder={mode === "internal" ? "Internal note (staff only)…" : "Write a message…"}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSubmit();
            }
          }}
        />
        <button
          type="button"
          data-testid="composer-send"
          disabled={!text.trim() || send.isPending || note.isPending}
          onClick={() => void onSubmit()}
          className="p-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {uploadPct != null && (
        <div className="mt-2 text-xs text-zinc-500">Uploading… {uploadPct}%</div>
      )}
    </div>
  );
}
