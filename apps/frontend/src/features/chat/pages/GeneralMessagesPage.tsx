import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { chatApi, type ChatMessage } from "../lib/chat.api";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function sourceBadge(m: ChatMessage): string {
  if (m.source === "whatsapp" || m.channel === "whatsapp") return "WhatsApp";
  if (m.senderType === "admin") return "Admin";
  if (m.source === "system") return "System";
  return "Platform";
}

export default function GeneralMessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { t } = useT();
  const basePath = user?.role === "SUPPLIER" ? "/supplier/messages" : "/buyer/messages";

  const { data: conversations, isLoading: listLoading } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: chatApi.listConversations,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["chat", "thread", conversationId],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  const { data: waStatus } = useQuery({
    queryKey: ["chat", "whatsapp-status"],
    queryFn: chatApi.status,
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
      await qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    } catch {
      toast.error(t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }, [conversationId, draft, sending, qc, t]);

  const showChat = Boolean(conversationId);

  return (
    <div data-testid="general-messages-page" className="max-w-[1400px] mx-auto h-[calc(100vh-6rem)] animate-fade-in">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Collaboration</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-[#128c7e]" aria-hidden />
            {t("chat.messagesTitle")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("chat.messagesSubtitle")}
            {waStatus?.mode === "live" && (
              <span className="ml-2 text-[#128c7e] font-medium">· {t("chat.whatsappActive")}</span>
            )}
          </p>
        </div>
      </header>

      <div className="dmx-card overflow-hidden flex h-[calc(100%-5rem)] min-h-[480px]">
        <aside
          className={[
            "w-full lg:w-[320px] shrink-0 border-r border-paper-200 flex flex-col bg-white",
            showChat ? "hidden lg:flex" : "flex",
          ].join(" ")}
        >
          <div className="px-4 py-3 border-b border-paper-100 text-sm font-semibold text-zinc-600">
            Konuşmalar
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-paper-100">
            {listLoading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Yükleniyor…</div>
            ) : !conversations?.length ? (
              <div data-testid="messages-list-empty" className="p-6 text-center text-zinc-500 text-sm">
                Henüz sohbet yok. Ticaret partnerinizle workspace içinden mesajlaşmaya başlayın veya telefon numarası tanımlayın.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`messages-list-row-${c.id}`}
                  onClick={() => nav(`${basePath}/${c.id}`)}
                  className={[
                    "w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors",
                    conversationId === c.id ? "bg-[#f0f2f5]" : "",
                  ].join(" ")}
                >
                  <div className="font-medium text-sm text-ink-900 truncate">{c.peerName}</div>
                  <div className="text-xs text-zinc-500 truncate mt-0.5">
                    {c.contextRef ? `${c.contextType === "RFQ" ? "RFQ" : "Navlun"} · ${c.contextRef}` : c.lastMessage ?? "—"}
                  </div>
                  {c.lastChannel === "whatsapp" && (
                    <span className="text-[10px] text-[#128c7e] mt-1 inline-block">WhatsApp</span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <main className={["flex-1 flex flex-col min-w-0 bg-[#efeae2]", showChat ? "flex" : "hidden lg:flex"].join(" ")}>
          {!conversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8 text-zinc-500">
              <MessageCircle className="h-12 w-12 text-[#128c7e]/30 mb-3" />
              <p className="text-sm">Sohbet başlatmak için soldan bir konuşma seçin</p>
            </div>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">Yükleniyor…</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
                <button type="button" className="lg:hidden text-[#128c7e]" onClick={() => nav(basePath)}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{thread?.conversation.peerName}</div>
                  {thread?.conversation.contextRef && (
                    <div className="text-xs text-zinc-500">
                      {thread.conversation.contextType === "RFQ" ? "RFQ" : "Navlun"} · {thread.conversation.contextRef}
                    </div>
                  )}
                  {thread?.conversation.peerPhone && (
                    <div className="text-xs text-zinc-500">WhatsApp: +{thread.conversation.peerPhone.replace(/\D/g, "")}</div>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2" data-testid="chat-messages">
                {(thread?.messages ?? []).map((m: ChatMessage) => (
                  <div
                    key={m.id}
                    className={[
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
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
                  data-testid="chat-input"
                  className="flex-1 rounded-lg border border-paper-200 px-3 py-2 text-sm bg-white"
                  placeholder={t("chat.inputPlaceholder")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(); } }}
                />
                <button
                  type="button"
                  data-testid="chat-send"
                  disabled={sending || !draft.trim()}
                  className="dmx-btn-primary px-3 py-2 disabled:opacity-50"
                  onClick={() => void onSend()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
