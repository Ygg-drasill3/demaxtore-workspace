import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { chatApi } from "../lib/chat.api";
import { WhatsAppChatPanel } from "../components/WhatsAppChatPanel";

/** FreightIQ Messages — native conversation API (ORDER_FREIGHT + RFQ-linked). */
export default function FreightIqMessagesPage() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const workspaceRfqId = params.get("workspaceRfqId");
  const freightIqRfqId = params.get("rfqId");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["chat", "freightiq-messages", orderId, workspaceRfqId, freightIqRfqId],
    queryFn: async () => {
      if (orderId) {
        await chatApi.syncOrderFreight(orderId);
        return chatApi.listWorkspaceConversations("ORDER_FREIGHT", orderId);
      }
      if (workspaceRfqId || freightIqRfqId) {
        return chatApi.listByRfq({ workspaceRfqId: workspaceRfqId ?? undefined, freightIqRfqId: freightIqRfqId ?? undefined });
      }
      const all = await chatApi.listConversations();
      return all.filter((c) => c.contextType === "ORDER_FREIGHT");
    },
  });

  useEffect(() => {
    if (conversations?.length && !activeId) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const active = conversations?.find((c) => c.id === activeId);

  return (
    <div data-testid="freightiq-messages-page" className="max-w-[1400px] mx-auto h-[calc(100vh-6rem)] animate-fade-in">
      <header className="mb-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-[#128c7e]" aria-hidden />
          FreightIQ Messages
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Navlun sohbetleri — forwarder WhatsApp yanıtları burada senkronize olur
        </p>
      </header>

      <div className="dmx-card overflow-hidden flex h-[calc(100%-5rem)] min-h-[480px]">
        <aside className="w-full lg:w-[280px] shrink-0 border-r border-paper-200 bg-white overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-zinc-500">Yükleniyor…</div>
          ) : !conversations?.length ? (
            <div className="p-4 text-sm text-zinc-500">Henüz navlun sohbeti yok.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={[
                  "w-full text-left px-4 py-3 border-b border-paper-100 hover:bg-zinc-50",
                  activeId === c.id ? "bg-[#f0f2f5]" : "",
                ].join(" ")}
              >
                <div className="text-sm font-medium truncate">{c.peerName}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {c.contextRef ? `Navlun · ${c.contextRef}` : c.lastMessage ?? "—"}
                </div>
              </button>
            ))
          )}
        </aside>
        <div className="flex-1 min-w-0">
          <WhatsAppChatPanel
            conversationId={activeId}
            peerName={active?.peerName}
            peerPhone={active?.whatsappPhone ?? active?.peerPhone}
            contextLabel={active?.contextRef ? `Navlun · ${active.contextRef}` : "FreightIQ"}
            testId="freightiq-messages-panel"
            heightClass="h-full min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
}
