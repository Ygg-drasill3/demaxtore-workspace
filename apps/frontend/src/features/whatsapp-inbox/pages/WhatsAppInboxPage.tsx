import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  Phone,
  Send,
  AlertCircle,
} from "lucide-react";
import { whatsappInboxApi, type WhatsAppMessage } from "../lib/whatsapp-inbox.api";
import { WhatsAppMediaImage } from "../components/WhatsAppMediaImage";
import { toast } from "@/store/toast.store";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/store/auth.store";

function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

function StatusIcon({ msg }: { msg: WhatsAppMessage }) {
  if (msg.direction === "INBOUND") return null;
  if (msg.status === "failed") return <AlertCircle className="h-3 w-3 text-red-500" />;
  if (msg.status === "read") return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (msg.status === "delivered") return <CheckCheck className="h-3 w-3 text-zinc-400" />;
  if (msg.status === "sent") return <Check className="h-3 w-3 text-zinc-400" />;
  return <Clock className="h-3 w-3 text-zinc-400" />;
}

function displayName(profileName: string | null, phone: string) {
  return profileName?.trim() || `+${phone}`;
}

export default function WhatsAppInboxPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const basePath =
    user?.role === "SALES_CONTROL" ? "/sales/whatsapp" : "/admin/whatsapp-inbox";

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<WhatsAppMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["whatsapp-inbox", "conversations"],
    queryFn: () => whatsappInboxApi.listConversations(),
    refetchInterval: () => (getSocket().connected ? false : 8_000),
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["whatsapp-inbox", "thread", conversationId],
    queryFn: () => whatsappInboxApi.getMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: () => (getSocket().connected ? false : 8_000),
  });

  useEffect(() => {
    if (!conversationId) return;
    void whatsappInboxApi.markRead(conversationId).then(() => {
      void qc.invalidateQueries({ queryKey: ["whatsapp-inbox", "conversations"] });
    });
  }, [conversationId, qc]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread?.messages.length, conversationId]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["whatsapp-inbox", "conversations"] });
    if (conversationId) {
      void qc.invalidateQueries({ queryKey: ["whatsapp-inbox", "thread", conversationId] });
    }
  }, [qc, conversationId]);

  useEffect(() => {
    const sock = getSocket();
    const onNew = (payload: { conversationId?: string }) => {
      if (payload.conversationId && conversationId && payload.conversationId !== conversationId) {
        void qc.invalidateQueries({ queryKey: ["whatsapp-inbox", "conversations"] });
        return;
      }
      invalidate();
    };
    const onStatus = onNew;
    const onConv = () => void qc.invalidateQueries({ queryKey: ["whatsapp-inbox", "conversations"] });

    sock.on("whatsapp:message:new", onNew);
    sock.on("whatsapp:message:status", onStatus);
    sock.on("whatsapp:conversation:updated", onConv);
    return () => {
      sock.off("whatsapp:message:new", onNew);
      sock.off("whatsapp:message:status", onStatus);
      sock.off("whatsapp:conversation:updated", onConv);
    };
  }, [conversationId, invalidate, qc]);

  const onSend = async () => {
    if (!conversationId || !draft.trim() || sending) return;
    if (thread && !thread.conversation.serviceWindowOpen) {
      toast.error("24 saatlik müşteri hizmeti penceresi kapalı. Şablon mesaj kullanın.");
      return;
    }
    setSending(true);
    try {
      await whatsappInboxApi.sendMessage({
        conversationId,
        type: "text",
        text: draft.trim(),
        replyToMessageId: replyTo?.id,
      });
      setDraft("");
      setReplyTo(null);
      invalidate();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { code?: string; message?: string } } };
      toast.error(err.response?.data?.message ?? "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const conversations = listData?.items ?? [];

  return (
    <div data-testid="whatsapp-inbox-page" className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)]">
      <header className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-[#25D366]" />
        <div>
          <h1 className="font-display text-2xl font-semibold">WhatsApp Inbox</h1>
          <p className="text-sm text-zinc-500">Meta Cloud API — gerçek zamanlı müşteri mesajları</p>
        </div>
      </header>

      <div className="dmx-card overflow-hidden flex h-[calc(100%-4rem)] min-h-[520px]">
        <aside
          className={[
            "w-full lg:w-[380px] shrink-0 border-r border-paper-200 overflow-y-auto bg-white",
            conversationId ? "hidden lg:block" : "block",
          ].join(" ")}
        >
          {listLoading ? (
            <div className="p-4 text-sm text-zinc-500">Yükleniyor…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              Henüz mesaj yok. WhatsApp numaranıza gelen mesajlar burada görünecek.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => nav(`${basePath}/${c.id}`)}
                className={[
                  "w-full text-left px-4 py-3 border-b border-paper-100 hover:bg-zinc-50 transition-colors",
                  conversationId === c.id ? "bg-[#f0f2f5]" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {displayName(c.profileName, c.phoneNumber)}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-[#25D366] text-white text-[10px] px-1.5 py-0.5 min-w-[18px] text-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">
                  {c.lastMessagePreview ?? "—"}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">{formatTime(c.lastMessageAt)}</div>
              </button>
            ))
          )}
        </aside>

        <main
          className={[
            "flex-1 flex flex-col min-w-0 bg-[#efeae2]",
            conversationId ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          {!conversationId ? (
            <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
              <Phone className="h-10 w-10 text-[#128c7e]/30 mr-2" />
              Bir konuşma seçin
            </div>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Yükleniyor…</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
                <button type="button" className="lg:hidden" onClick={() => nav(basePath)}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {displayName(
                      thread?.conversation.profileName ?? null,
                      thread?.conversation.phoneNumber ?? "",
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>+{thread?.conversation.phoneNumber}</span>
                    {thread?.conversation.serviceWindowOpen ? (
                      <span className="text-[#128c7e]">● 24s pencere açık</span>
                    ) : (
                      <span className="text-amber-600">● Şablon gerekli</span>
                    )}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2">
                {(thread?.messages ?? []).map((m) => {
                  const isOut = m.direction === "OUTBOUND";
                  return (
                    <div
                      key={m.id}
                      className={[
                        "max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        isOut ? "ml-auto bg-[#d9fdd3]" : "mr-auto bg-white",
                      ].join(" ")}
                    >
                      {m.type !== "text" && !m.body && (
                        <div className="text-xs text-zinc-500 mb-1 uppercase">{m.type}</div>
                      )}
                      {m.hasMedia && m.mimeType?.startsWith("image/") ? (
                        <WhatsAppMediaImage
                          messageId={m.id}
                          alt={m.caption ?? "media"}
                          className="max-w-full rounded mb-1 max-h-64 object-contain"
                        />
                      ) : m.hasMedia ? (
                        <button
                          type="button"
                          className="text-[#128c7e] underline text-xs"
                          onClick={() => {
                            void whatsappInboxApi.fetchMediaBlob(m.id).then((blob) => {
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank");
                              setTimeout(() => URL.revokeObjectURL(url), 60_000);
                            });
                          }}
                        >
                          📎 {m.filename ?? "Dosya indir"}
                        </button>
                      ) : null}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      {m.caption && m.type !== "text" && (
                        <p className="whitespace-pre-wrap text-zinc-600 mt-1">{m.caption}</p>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          className="hover:underline mr-auto"
                          onClick={() => setReplyTo(m)}
                        >
                          Yanıtla
                        </button>
                        <span>{formatTime(m.createdAt)}</span>
                        <StatusIcon msg={m} />
                      </div>
                      {m.status === "failed" && m.errorMessage && (
                        <div className="text-[10px] text-red-600 mt-1">{m.errorMessage}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {replyTo && (
                <div className="px-3 py-2 bg-zinc-100 border-t border-paper-200 text-xs flex justify-between">
                  <span className="truncate">Yanıt: {replyTo.body?.slice(0, 80) ?? `[${replyTo.type}]`}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-500 ml-2">
                    ✕
                  </button>
                </div>
              )}

              <div className="border-t border-paper-200 bg-[#f0f2f5] p-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-paper-200 px-3 py-2 text-sm bg-white min-w-0"
                  placeholder={
                    thread?.conversation.serviceWindowOpen
                      ? "Mesaj yazın…"
                      : "24s pencere kapalı — şablon kullanın"
                  }
                  value={draft}
                  disabled={!thread?.conversation.serviceWindowOpen}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void onSend()}
                />
                <button
                  type="button"
                  disabled={sending || !draft.trim() || !thread?.conversation.serviceWindowOpen}
                  onClick={() => void onSend()}
                  className="shrink-0 rounded-lg bg-[#128c7e] text-white px-4 py-2 disabled:opacity-50 flex items-center gap-1"
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
