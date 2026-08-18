import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, MessagesSquare, PanelRight } from "lucide-react";
import type { UnifiedMessageDto } from "@dmx/contracts/unified-messaging";
import { useAuth } from "@/store/auth.store";
import {
  useConversation,
  useConversationFiltersFromUrl,
  useInfiniteConversations,
  useInfiniteMessages,
  useMarkRead,
} from "../hooks/useConversations";
import { useMessagingSocket } from "../hooks/useMessagingSocket";
import { unifiedMessagesApi } from "../lib/unified-messages.api";
import {
  PremiumConversationHeader,
  PremiumConversationSidebar,
} from "../components/premium/PremiumConversationSidebar";
import { PremiumMessageTimeline } from "../components/premium/PremiumMessageTimeline";
import { PremiumMessageComposer } from "../components/premium/PremiumMessageComposer";
import { PremiumContextPanel } from "../components/premium/PremiumContextPanel";

export default function UnifiedMessagesPage() {
  const { conversationId: paramId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const filters = useConversationFiltersFromUrl();
  const conversationId = paramId ?? searchParams.get("conversationId") ?? undefined;

  const [search, setSearch] = useState(filters.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [mobileView, setMobileView] = useState<"list" | "timeline" | "context">(() =>
    conversationId ? "timeline" : "list",
  );
  const [replyTo, setReplyTo] = useState<UnifiedMessageDto | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useInfiniteConversations({ search: debouncedSearch || undefined });
  const messagesQuery = useInfiniteMessages(conversationId);
  const { data: detail } = useConversation(conversationId);
  const markRead = useMarkRead(conversationId ?? "");
  useMessagingSocket(conversationId);

  const conversations = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listQuery.data],
  );

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flatMap((p) => p.items);
  }, [messagesQuery.data]);

  const stickToBottomRef = useRef(true);
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = conversationId;
      stickToBottomRef.current = true;
      prevMessageCountRef.current = 0;
    }
  }, [conversationId]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el || !conversationId || messages.length === 0) return;

    const conversationChanged = prevMessageCountRef.current === 0;
    const grew = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (stickToBottomRef.current || conversationChanged || grew) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [conversationId, messages.length, messagesQuery.isFetching]);

  const isRfqThread = useMemo(
    () => Boolean(detail?.contexts?.some((c) => c.contextType === "RFQ")),
    [detail],
  );
  const whatsappTargetPhone = useMemo(() => {
    const raw = detail?.metadata?.rfqSupplierWhatsAppPhone;
    if (typeof raw !== "string") return null;
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("90") && digits.length === 12) {
      return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    return raw.startsWith("+") ? raw : `+${digits}`;
  }, [detail?.metadata]);
  const canInternalNote = useMemo(
    () => user?.role && !["BUYER", "SUPPLIER"].includes(user.role),
    [user?.role],
  );

  useEffect(() => {
    if (conversationId) void markRead.mutate();
  }, [conversationId]);

  useEffect(() => {
    if (conversationId && typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileView("timeline");
    }
  }, [conversationId]);

  const selectConversation = (id: string) => {
    navigate(`/messages/${id}${window.location.search}`);
    setMobileView("timeline");
  };

  const onListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      void listQuery.fetchNextPage();
    }
  }, [listQuery]);

  const onTimelineScroll = useCallback(() => {
    const el = timelineRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
    if (el.scrollTop < 40) {
      void messagesQuery.fetchNextPage();
    }
  }, [messagesQuery]);

  const showTimeline = conversationId && (mobileView === "timeline" || window.innerWidth >= 768);

  return (
    <div
      className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-paper-50"
      data-testid="unified-messages-page"
    >
      <PremiumConversationSidebar
        items={conversations}
        activeId={conversationId}
        search={search}
        onSearch={setSearch}
        onSelect={selectConversation}
        onScroll={onListScroll}
        listRef={listRef}
        isLoading={listQuery.isLoading}
      />

      <main className={`flex-1 flex flex-col min-w-0 ${showTimeline ? "flex" : "hidden md:flex"}`}>
          {!conversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-paper-50 to-white px-6 text-center">
              <div className="mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-sky-50 to-paper-100 ring-1 ring-accent-900/10 shadow-card">
                <MessagesSquare className="h-10 w-10 text-accent-900/50" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-950">Workspace conversations</h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-500 leading-relaxed">
                Chat with suppliers and your team inside each RFQ, order, or shipment workspace.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 md:hidden border-b border-paper-100 px-3 py-2 bg-white/90 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  aria-label="Back"
                  className="p-1.5 rounded-lg text-zinc-500 hover:bg-paper-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:bg-paper-100"
                  data-testid="unified-messages-context-toggle"
                  onClick={() => setMobileView("context")}
                >
                  <PanelRight className="h-5 w-5" />
                </button>
              </div>
              <PremiumConversationHeader detail={detail} />
              <PremiumMessageTimeline
                messages={messages}
                onReply={setReplyTo}
                onRetry={(m) => void unifiedMessagesApi.retryMessage(conversationId, m.id)}
                timelineRef={timelineRef}
                onScroll={onTimelineScroll}
              />
              <PremiumMessageComposer
                conversationId={conversationId}
                canInternalNote={Boolean(canInternalNote)}
                hasWhatsApp={isRfqThread && Boolean(whatsappTargetPhone)}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
              />
            </>
          )}
      </main>

      <aside className="hidden lg:block">
        {conversationId && detail && (
          <PremiumContextPanel detail={detail} conversationId={conversationId} />
        )}
      </aside>

      {mobileView === "context" && conversationId && detail && (
        <PremiumContextPanel
          detail={detail}
          conversationId={conversationId}
          mobile
          onClose={() => setMobileView("timeline")}
        />
      )}
    </div>
  );
}
