import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../lib/chat.api";
import { WhatsAppChatPanel } from "./WhatsAppChatPanel";
import { useAuth } from "@/store/auth.store";

type Props = {
  rfqWorkspaceId: string;
  rfqRef?: string | null;
  testId?: string;
};

/** RFQ-scoped WhatsApp chat — one thread per assigned supplier (buyer) or buyer thread (supplier). */
export function RfqWhatsAppChatPanel({ rfqWorkspaceId, rfqRef, testId = "rfq-whatsapp-chat" }: Props) {
  const user = useAuth((s) => s.user);
  const isSupplier = user?.role === "SUPPLIER";
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: waStatus } = useQuery({
    queryKey: ["chat", "whatsapp-status"],
    queryFn: chatApi.status,
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["chat", "rfq", rfqWorkspaceId, user?.id],
    queryFn: async () => {
      await chatApi.ensureRfq(rfqWorkspaceId);
      return chatApi.listWorkspaceConversations("RFQ", rfqWorkspaceId);
    },
  });

  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const active = conversations?.find((c) => c.id === activeId);
  const showSidebar = !isSupplier && (conversations?.length ?? 0) > 1;
  const missingPhone = active && active.whatsappReady === false;

  return (
    <div data-testid={testId} className="dmx-card overflow-hidden">
      <div className="border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
        <h2 className="font-medium text-ink-900">Messages</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          RFQ {rfqRef ?? ""} — {isSupplier ? "alıcı ile panel + WhatsApp" : "tedarikçi ile panel + WhatsApp hibrit sohbet"}
          {waStatus?.mode === "live" && (
            <span className="ml-2 text-[#128c7e] font-medium">· WhatsApp aktif</span>
          )}
        </p>
        {missingPhone && (
          <p className="text-xs text-amber-700 mt-1">
            WhatsApp numarası tanımlı değil — mesajlar yalnızca panelde kalır.
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row min-h-[320px]">
        {showSidebar && (
          <aside className="lg:w-[240px] shrink-0 border-b lg:border-b-0 lg:border-r border-paper-200 bg-white">
            {isLoading ? (
              <div className="p-4 text-sm text-zinc-500">Yükleniyor…</div>
            ) : !conversations?.length ? (
              <div className="p-4 text-sm text-zinc-500">
                Henüz tedarikçi atanmadı. Admin RFQ&apos;ye supplier atayınca sohbet burada açılır.
              </div>
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
                  <div className="text-xs text-zinc-500 truncate">{c.lastMessage ?? "Yeni sohbet"}</div>
                  {c.whatsappReady === false && (
                    <span className="text-[10px] text-amber-600">WhatsApp yok</span>
                  )}
                </button>
              ))
            )}
          </aside>
        )}

        {!showSidebar && !isLoading && !conversations?.length && (
          <div className="p-4 text-sm text-zinc-500 w-full">
            {isSupplier
              ? "Bu RFQ için henüz mesaj thread'iniz açılmadı."
              : "Henüz tedarikçi atanmadı. Admin RFQ'ye supplier atayınca sohbet burada açılır."}
          </div>
        )}

        {(conversations?.length ?? 0) > 0 && (
          <div className="flex-1 min-w-0">
            <WhatsAppChatPanel
              conversationId={activeId}
              peerName={active?.peerName}
              peerPhone={active?.peerPhone}
              contextLabel={rfqRef ? `RFQ ${rfqRef}` : undefined}
              testId={`${testId}-panel`}
              heightClass="h-[min(420px,45vh)] min-h-[280px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
