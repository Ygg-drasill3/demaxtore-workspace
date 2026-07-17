import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { ConversationListFilters } from "@dmx/contracts/unified-messaging";
import { unifiedMessagesApi } from "../lib/unified-messages.api";

export function useConversationFiltersFromUrl(): ConversationListFilters {
  const [params] = useSearchParams();
  return {
    channel: (params.get("channel") as ConversationListFilters["channel"]) ?? undefined,
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
  return useQuery({
    queryKey: ["unified-messages", "conversations", merged],
    queryFn: () => unifiedMessagesApi.listConversations(merged),
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
  return useMutation({
    mutationFn: (body: { text: string; channel?: "WORKSPACE" | "WHATSAPP"; clientMessageId?: string }) =>
      unifiedMessagesApi.sendMessage(conversationId, {
        body: body.text,
        channel: body.channel ?? "WORKSPACE",
        clientMessageId: body.clientMessageId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["unified-messages", "messages", conversationId] });
      void qc.invalidateQueries({ queryKey: ["unified-messages", "conversations"] });
    },
  });
}

export function useSendInternalNote(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => unifiedMessagesApi.sendInternalNote(conversationId, { body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["unified-messages", "messages", conversationId] });
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
