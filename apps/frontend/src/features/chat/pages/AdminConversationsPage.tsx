import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Send, Shield } from "lucide-react";
import { chatApi, type ChatMessage } from "../lib/chat.api";
import { toast } from "@/store/toast.store";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function sourceBadge(m: ChatMessage): string {
  if (m.source === "whatsapp" || m.channel === "whatsapp") return "WhatsApp";
  if (m.senderType === "admin") return "Admin";
  if (m.source === "system") return "System";
  return "Platform";
}

/** Admin — all WhatsApp/platform conversations across RFQ + Freight. */
export default function AdminConversationsPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["chat", "admin-all"],
    queryFn: chatApi.listAllAdmin,
  });

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["chat", "thread", conversationId],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  const onSend = async () => {
    if (!conversationId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await chatApi.sendMessage(conversationId, draft.trim());
      setDraft("");
      await qc.invalidateQueries({ queryKey: ["chat", "thread", conversationId] });
      await qc.invalidateQueries({ queryKey: ["chat", "admin-all"] });
    } catch {
      toast.error("Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="admin-conversations-page" className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)]">
      <header className="mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6 text-accent-900" />
        <div>
          <h1 className="font-display text-2xl font-semibold">All Conversations</h1>
          <p className="text-sm text-zinc-500">RFQ + FreightIQ WhatsApp hibrit sohbetler — admin görünümü</p>
        </div>
      </header>

      <div className="dmx-card overflow-hidden flex h-[calc(100%-4rem)] min-h-[520px]">
        <aside className={["w-full lg:w-[360px] shrink-0 border-r border-paper-200 overflow-y-auto", conversationId ? "hidden lg:block" : "block"].join(" ")}>
          {isLoading ? (
            <div className="p-4 text-sm text-zinc-500">Yükleniyor…</div>
          ) : (
            conversations?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => nav(`/admin/conversations/${c.id}`)}
                className={["w-full text-left px-4 py-3 border-b border-paper-100 hover:bg-zinc-50", conversationId === c.id ? "bg-[#f0f2f5]" : ""].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{c.peerName}</span>
                  <span className="text-[10px] uppercase text-zinc-400">{c.contextType}</span>
                </div>
                <div className="text-xs text-zinc-500 truncate">{c.contextRef ?? c.lastMessage ?? "—"}</div>
              </button>
            ))
          )}
        </aside>

        <main className={["flex-1 flex flex-col min-w-0 bg-[#efeae2]", conversationId ? "flex" : "hidden lg:flex"].join(" ")}>
          {!conversationId ? (
            <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
              <MessageCircle className="h-10 w-10 text-[#128c7e]/30 mr-2" />
              Bir konuşma seçin veya dahil olun
            </div>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Yükleniyor…</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
                <button type="button" className="lg:hidden" onClick={() => nav("/admin/conversations")}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="font-semibold text-sm">{thread?.conversation.peerName}</div>
                  <div className="text-xs text-zinc-500">
                    {thread?.conversation.contextType} · {thread?.conversation.contextRef}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {(thread?.messages ?? []).map((m) => (
                  <div key={m.id} className={["max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm", m.isOwn ? "ml-auto bg-[#d9fdd3]" : "mr-auto bg-white"].join(" ")}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <div className="text-[10px] text-zinc-500 mt-1 flex gap-2">
                      <span>{formatTime(m.createdAt)}</span>
                      <span>{sourceBadge(m)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-paper-200 bg-[#f0f2f5] p-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-paper-200 px-3 py-2 text-sm bg-white"
                  placeholder="Admin olarak mesaj yazın…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(); } }}
                />
                <button type="button" disabled={sending || !draft.trim()} className="dmx-btn-primary px-3 py-2" onClick={() => void onSend()}>
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
