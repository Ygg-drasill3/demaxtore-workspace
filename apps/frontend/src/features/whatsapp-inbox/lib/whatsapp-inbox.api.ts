import { api } from "@/lib/api";

export type WhatsAppConversation = {
  id: string;
  contactId: string;
  waId: string;
  phoneNumber: string;
  profileName: string | null;
  phoneNumberId: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  status: string;
  assigneeUserId: string | null;
  serviceWindowOpen: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMessage = {
  id: string;
  conversationId: string;
  metaMessageId: string | null;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  mediaId: string | null;
  hasMedia: boolean;
  mimeType: string | null;
  filename: string | null;
  caption: string | null;
  replyToMessageId: string | null;
  replyToMetaId: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  authorUserId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const whatsappInboxApi = {
  listConversations: (cursor?: string) =>
    api
      .get<{ items: WhatsAppConversation[]; nextCursor: string | null }>(
        "/whatsapp/conversations",
        { params: cursor ? { cursor } : undefined },
      )
      .then((r) => r.data),

  getMessages: (conversationId: string, cursor?: string) =>
    api
      .get<{
        conversation: WhatsAppConversation;
        messages: WhatsAppMessage[];
        nextCursor: string | null;
      }>(`/whatsapp/conversations/${conversationId}/messages`, {
        params: cursor ? { cursor } : undefined,
      })
      .then((r) => r.data),

  markRead: (conversationId: string) =>
    api.post<{ ok: boolean }>(`/whatsapp/conversations/${conversationId}/read`).then((r) => r.data),

  sendMessage: (payload: {
    conversationId?: string;
    to?: string;
    type?: "text" | "template" | "image" | "document";
    text?: string;
    templateName?: string;
    templateLanguage?: string;
    replyToMessageId?: string;
  }) => api.post<WhatsAppMessage>("/whatsapp/messages", payload).then((r) => r.data),

  fetchMediaBlob: (messageId: string) =>
    api.get<Blob>(`/whatsapp/media/${messageId}`, { responseType: "blob" }).then((r) => r.data),
};
