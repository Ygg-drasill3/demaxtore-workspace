import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, PanelRight } from "lucide-react";
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
import { PhoneVerificationGate } from "@/features/phone-verification/components/PhoneVerificationGate";
import { usePhoneVerificationMe } from "@/features/phone-verification/hooks/usePhoneVerification";
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

  const canInternalNote = useMemo(
    () => user?.role && !["BUYER", "SUPPLIER"].includes(user.role),
    [user?.role],
  );
  const phoneMe = usePhoneVerificationMe();
  const canMessage = phoneMe.data?.canMessage ?? true;
  const needsPhoneGate = user?.role === "BUYER" || user?.role === "SUPPLIER";

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
    if (!el || !messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
    if (el.scrollTop < 40) {
      void messagesQuery.fetchNextPage();
    }
  }, [messagesQuery]);

  const showTimeline = conversationId && (mobileView === "timeline" || window.innerWidth >= 768);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#fafafa]" data-testid="unified-messages-page">
      <PremiumConversationSidebar
        items={conversations}
        activeId={conversationId}
        search={search}
        onSearch={setSearch}
        filterParams={searchParams}
        onSelect={selectConversation}
        onScroll={onListScroll}
        listRef={listRef}
        isLoading={listQuery.isLoading}
      />

      <PhoneVerificationGate>
        <main className={`flex-1 flex flex-col min-w-0 ${showTimeline ? "flex" : "hidden md:flex"}`}>
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
              Select a conversation to view the timeline
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 md:hidden border-b px-3 py-2 bg-white">
                <button type="button" onClick={() => setMobileView("list")} aria-label="Back">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="ml-auto"
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
                hasWhatsApp={detail?.primaryChannel === "WHATSAPP"}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                disabled={needsPhoneGate && !canMessage}
              />
            </>
          )}
        </main>
      </PhoneVerificationGate>

      {!needsPhoneGate || canMessage ? (
        <aside className="hidden lg:block">
          {conversationId && detail && (
            <PremiumContextPanel detail={detail} conversationId={conversationId} />
          )}
        </aside>
      ) : null}

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
