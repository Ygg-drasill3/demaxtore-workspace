import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { ConversationListFilters, UnifiedMessageDto } from "@dmx/contracts/unified-messaging";
import { useAuth } from "@/store/auth.store";
import { unifiedMessagesApi, type MessagePage } from "../lib/unified-messages.api";

function invalidateMessageQueries(qc: QueryClient, conversationId: string) {
  void qc.invalidateQueries({ queryKey: ["unified-messages", "messages-infinite", conversationId] });
  void qc.invalidateQueries({ queryKey: ["unified-messages", "messages", conversationId] });
  void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations"] });
  void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations-infinite"] });
}

function appendOptimisticMessage(
  qc: QueryClient,
  conversationId: string,
  message: UnifiedMessageDto,
) {
  qc.setQueryData<InfiniteData<MessagePage>>(
    ["unified-messages", "messages-infinite", conversationId],
    (old) => {
      if (!old?.pages.length) return old;
      const pages = [...old.pages];
      const last = pages[pages.length - 1]!;
      pages[pages.length - 1] = { ...last, items: [...last.items, message] };
      return { ...old, pages };
    },
  );
  qc.setQueryData<MessagePage>(["unified-messages", "messages", conversationId], (old) =>
    old ? { ...old, items: [...old.items, message] } : old,
  );
}

function removeOptimisticMessage(qc: QueryClient, conversationId: string, clientMessageId: string) {
  const pendingId = `pending-${clientMessageId}`;
  qc.setQueryData<InfiniteData<MessagePage>>(
    ["unified-messages", "messages-infinite", conversationId],
    (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.filter((m) => m.id !== pendingId),
        })),
      };
    },
  );
  qc.setQueryData<MessagePage>(["unified-messages", "messages", conversationId], (old) =>
    old ? { ...old, items: old.items.filter((m) => m.id !== pendingId) } : old,
  );
}

export function useConversationFiltersFromUrl(): ConversationListFilters {
  const [params] = useSearchParams();
  const channelParam = params.get("channel");
  return {
    channel:
      channelParam === "WORKSPACE" || channelParam === "WHATSAPP" || channelParam === "SYSTEM"
        ? channelParam
        : undefined,
    contextType: (params.get("contextType") as ConversationListFilters["contextType"]) ?? undefined,
    contextId: params.get("contextId") ?? undefined,
    assignedUserId: params.get("assignedTo") === "me" ? "me" : params.get("assignedUserId") ?? undefined,
    unread: params.get("unread") === "true" ? true : undefined,
    archived: params.get("archived") === "true" ? true : params.get("archived") === "false" ? false : undefined,
    search: params.get("q") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : 30,
  };
}

export function useConversations(filters?: ConversationListFilters) {
  const urlFilters = useConversationFiltersFromUrl();
  const merged = { ...urlFilters, ...filters };
  if (filters?.contextType && filters?.contextId) {
    delete merged.channel;
  }
  return useQuery({
    queryKey: ["unified-messages", "conversations", merged],
    queryFn: () => unifiedMessagesApi.listConversations(merged),
  });
}

export function useInfiniteConversations(filters?: ConversationListFilters) {
  const urlFilters = useConversationFiltersFromUrl();
  const merged = { ...urlFilters, ...filters, limit: filters?.limit ?? 30 };
  if (filters?.contextType && filters?.contextId) {
    delete merged.channel;
  }
  return useInfiniteQuery({
    queryKey: ["unified-messages", "conversations-infinite", merged],
    queryFn: ({ pageParam }) =>
      unifiedMessagesApi.listConversations({ ...merged, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  });
}

export function useInfiniteMessages(conversationId?: string) {
  return useInfiniteQuery({
    queryKey: ["unified-messages", "messages-infinite", conversationId],
    queryFn: ({ pageParam }) =>
      unifiedMessagesApi.listMessages(conversationId!, pageParam as string | undefined, 50),
    enabled: Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
    // Fallback while sockets are flaky — supplier WhatsApp replies should appear without hard refresh.
    refetchInterval: conversationId ? 5_000 : false,
  });
}

export function useConversation(conversationId?: string) {
  return useQuery({
    queryKey: ["unified-messages", "conversation", conversationId],
    queryFn: () => unifiedMessagesApi.getConversation(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useConversationMessages(conversationId?: string) {
  return useQuery({
    queryKey: ["unified-messages", "messages", conversationId],
    queryFn: () => unifiedMessagesApi.listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  return useMutation({
    mutationFn: (body: { text: string; channel?: "WORKSPACE" | "WHATSAPP"; clientMessageId?: string }) =>
      unifiedMessagesApi.sendMessage(conversationId, {
        body: body.text,
        channel: body.channel ?? "WORKSPACE",
        clientMessageId: body.clientMessageId,
      }),
    onMutate: async (body) => {
      const clientMessageId = body.clientMessageId ?? crypto.randomUUID();
      const channel = body.channel ?? "WORKSPACE";
      await qc.cancelQueries({ queryKey: ["unified-messages", "messages-infinite", conversationId] });
      await qc.cancelQueries({ queryKey: ["unified-messages", "messages", conversationId] });
      const optimistic: UnifiedMessageDto = {
        id: `pending-${clientMessageId}`,
        conversationId,
        senderUserId: user?.id ?? null,
        direction: "OUTBOUND",
        channel,
        audienceScope: "EXTERNAL",
        messageType: "MESSAGE",
        body: body.text,
        status: "ACTIVE",
        replyToMessageId: null,
        externalMessageId: null,
        whatsappMessageId: null,
        createdAt: new Date().toISOString(),
        sentAt: channel === "WORKSPACE" ? new Date().toISOString() : null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        failureReason: null,
      };
      appendOptimisticMessage(qc, conversationId, optimistic);
      return { clientMessageId };
    },
    onSuccess: (_data, _vars, ctx) => {
      if (ctx?.clientMessageId) {
        removeOptimisticMessage(qc, conversationId, ctx.clientMessageId);
      }
      invalidateMessageQueries(qc, conversationId);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.clientMessageId) {
        removeOptimisticMessage(qc, conversationId, ctx.clientMessageId);
      }
      invalidateMessageQueries(qc, conversationId);
    },
  });
}

export function useSendInternalNote(conversationId: string) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  return useMutation({
    mutationFn: (body: string) => unifiedMessagesApi.sendInternalNote(conversationId, { body }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["unified-messages", "messages-infinite", conversationId] });
      await qc.cancelQueries({ queryKey: ["unified-messages", "messages", conversationId] });
      const optimistic: UnifiedMessageDto = {
        id: `pending-note-${crypto.randomUUID()}`,
        conversationId,
        senderUserId: user?.id ?? null,
        direction: "INTERNAL",
        channel: "WORKSPACE",
        audienceScope: "INTERNAL",
        messageType: "INTERNAL_NOTE",
        body,
        status: "ACTIVE",
        replyToMessageId: null,
        externalMessageId: null,
        whatsappMessageId: null,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        failureReason: null,
      };
      appendOptimisticMessage(qc, conversationId, optimistic);
    },
    onSuccess: () => {
      invalidateMessageQueries(qc, conversationId);
    },
    onError: () => {
      invalidateMessageQueries(qc, conversationId);
    },
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unifiedMessagesApi.markRead(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations"] });
    },
  });
}
