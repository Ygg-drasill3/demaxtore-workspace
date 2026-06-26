import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { chatApi, type ChatMessage } from "../lib/chat.api";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

type Props = {
  conversationId: string | null;
  peerName?: string;
  peerPhone?: string | null;
  contextLabel?: string;
  testId?: string;
  heightClass?: string;
};

function sourceBadge(m: ChatMessage): string {
  if (m.source === "whatsapp" || m.channel === "whatsapp") return "WhatsApp";
  if (m.senderType === "admin") return "Admin";
  if (m.source === "system") return "System";
  return "Platform";
}

/** FreightIQ-style hybrid chat panel (panel + WhatsApp bridge). */
export function WhatsAppChatPanel({
  conversationId,
  peerName,
  peerPhone,
  contextLabel,
  testId = "whatsapp-chat-panel",
  heightClass = "h-[min(420px,45vh)]",
}: Props) {
  const { t } = useT();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["chat", "thread", conversationId],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread?.messages.length, conversationId]);

  const onSend = useCallback(async () => {
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await chatApi.sendMessage(conversationId, draft.trim());
      setDraft("");
      await qc.invalidateQueries({ queryKey: ["chat", "thread", conversationId] });
    } catch {
      toast.error(t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }, [conversationId, draft, sending, qc, t]);

  const title = peerName ?? thread?.conversation.peerName ?? "Partner";
  const phone = peerPhone ?? thread?.conversation.peerPhone;

  return (
    <section data-testid={testId} className={`flex flex-col overflow-hidden bg-[#efeae2] ${heightClass}`}>
      <div className="flex items-center gap-3 border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366]/15">
          <MessageCircle className="h-4 w-4 text-[#128c7e]" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-900">{title}</div>
          <div className="truncate text-xs text-zinc-500">
            {contextLabel ?? thread?.conversation.contextRef ?? "Workspace chat"}
            {phone ? ` · +${phone.replace(/\D/g, "")}` : ""}
          </div>
        </div>
      </div>

      {!conversationId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500 px-6 text-center">
          {t("chat.selectPartner")}
        </div>
      ) : isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">{t("chat.loading")}</div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2" data-testid={`${testId}-messages`}>
            {(thread?.messages ?? []).map((m: ChatMessage) => (
              <div
                key={m.id}
                className={[
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  m.isOwn ? "ml-auto bg-[#d9fdd3]" : "mr-auto bg-white",
                ].join(" ")}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                  <span>{formatTime(m.createdAt)}</span>
                  <span className={m.source === "whatsapp" || m.channel === "whatsapp" ? "text-[#128c7e]" : ""}>
                    {sourceBadge(m)}
                  </span>
                  {m.status === "failed" && <span className="text-red-600">failed</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-paper-200 bg-[#f0f2f5] p-3 flex gap-2">
            <input
              data-testid={`${testId}-input`}
              className="flex-1 rounded-lg border border-paper-200 px-3 py-2 text-sm bg-white"
              placeholder={t("chat.inputPlaceholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            <button
              type="button"
              data-testid={`${testId}-send`}
              disabled={sending || !draft.trim()}
              className="dmx-btn-primary px-3 py-2 disabled:opacity-50"
              onClick={() => void onSend()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
