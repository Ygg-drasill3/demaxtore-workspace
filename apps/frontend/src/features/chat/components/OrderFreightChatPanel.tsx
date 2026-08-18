import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../lib/chat.api";
import { WhatsAppChatPanel } from "./WhatsAppChatPanel";

type Props = {
  orderWorkspaceId: string;
  orderRef?: string | null;
  testId?: string;
};

/** Navlun teklifi — forwarder ile WhatsApp hibrit sohbet (RFQ chat ile aynı altyapı). */
export function OrderFreightChatPanel({ orderWorkspaceId, orderRef, testId = "order-freight-chat" }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["chat", "order-freight", orderWorkspaceId],
    queryFn: async () => {
      await chatApi.syncOrderFreight(orderWorkspaceId);
      return chatApi.listWorkspaceConversations("ORDER_FREIGHT", orderWorkspaceId);
    },
  });

  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const active = conversations?.find((c) => c.id === activeId);

  if (!isLoading && !conversations?.length) return null;

  return (
    <div data-testid={testId} className="dmx-card overflow-hidden mt-4">
      <div className="border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
        <h2 className="font-medium text-ink-900">Navlun mesajları</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Order {orderRef ?? ""} — forwarder ile WhatsApp + panel
        </p>
      </div>
      <div className="flex flex-col lg:flex-row min-h-[280px]">
        <aside className="lg:w-[220px] shrink-0 border-b lg:border-b-0 lg:border-r border-paper-200 bg-white">
          {isLoading ? (
            <div className="p-4 text-sm text-zinc-500">Yükleniyor…</div>
          ) : (
            conversations?.map((c) => (
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
              </button>
            ))
          )}
        </aside>
        <div className="flex-1 min-w-0">
          <WhatsAppChatPanel
            conversationId={activeId}
            peerName={active?.peerName}
            peerPhone={active?.peerPhone}
            contextLabel={orderRef ? `Navlun · ${orderRef}` : "Navlun"}
            testId={`${testId}-panel`}
            heightClass="h-[min(360px,40vh)] min-h-[240px]"
          />
        </div>
      </div>
    </div>
  );
}
