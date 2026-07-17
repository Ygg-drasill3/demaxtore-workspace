import { api } from "@/lib/api";
import type {
  ConversationListFilters,
  UnifiedConversationDetail,
  UnifiedConversationSummary,
  UnifiedMessageDto,
  CreateMessageRequest,
  CreateInternalNoteRequest,
} from "@dmx/contracts/unified-messaging";

export type ConversationPage = {
  items: UnifiedConversationSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type MessagePage = {
  items: UnifiedMessageDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const unifiedMessagesApi = {
  listConversations(filters: ConversationListFilters = {}) {
    return api
      .get<ConversationPage>("/messaging/conversations", { params: filters })
      .then((r) => r.data);
  },

  getConversation(id: string) {
    return api.get<UnifiedConversationDetail>(`/messaging/conversations/${id}`).then((r) => r.data);
  },

  listMessages(conversationId: string, cursor?: string, limit = 50) {
    return api
      .get<MessagePage>(`/messaging/conversations/${conversationId}/messages`, {
        params: { cursor, limit },
      })
      .then((r) => r.data);
  },

  sendMessage(conversationId: string, body: CreateMessageRequest) {
    return api
      .post<UnifiedMessageDto>(`/messaging/conversations/${conversationId}/messages`, body)
      .then((r) => r.data);
  },

  sendInternalNote(conversationId: string, body: CreateInternalNoteRequest) {
    return api
      .post<UnifiedMessageDto>(`/messaging/conversations/${conversationId}/internal-notes`, body)
      .then((r) => r.data);
  },

  markRead(conversationId: string) {
    return api
      .post<{ ok: boolean }>(`/messaging/conversations/${conversationId}/read`, {})
      .then((r) => r.data);
  },

  assign(conversationId: string, assignedUserId: string) {
    return api
      .post<UnifiedConversationDetail>(`/messaging/conversations/${conversationId}/assign`, {
        assignedUserId,
      })
      .then((r) => r.data);
  },

  archive(conversationId: string) {
    return api
      .post<UnifiedConversationDetail>(`/messaging/conversations/${conversationId}/archive`, {})
      .then((r) => r.data);
  },
};
