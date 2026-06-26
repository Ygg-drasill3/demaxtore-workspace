import { api } from "@/lib/api";

export type ChatPeer = {
  id?: string;
  displayName?: string;
  peerName?: string;
  peerPhone?: string | null;
  peerUserId?: string | null;
  forwarderContactId?: string | null;
};

export type ChatConversationRow = {
  id: string;
  conversationId?: string;
  contextType?: string;
  contextWorkspaceId?: string;
  contextRef?: string | null;
  workspaceRfqId?: string | null;
  freightIqRfqId?: string | null;
  buyerId?: string;
  supplierId?: string | null;
  peerName: string;
  peerPhone?: string | null;
  forwarderPhone?: string | null;
  whatsappPhone?: string | null;
  peer?: ChatPeer;
  lastMessage: string | null;
  lastAt: string | null;
  lastSource?: string | null;
  lastChannel?: string | null;
  whatsappReady?: boolean;
  status?: string;
  workspaceUrl?: string;
};

export type ChatMessage = {
  id: string;
  authorUserId?: string | null;
  senderUserId?: string | null;
  senderType?: "buyer" | "supplier" | "forwarder" | "admin" | "system";
  senderPhone?: string | null;
  channel: string;
  source?: "platform" | "whatsapp" | "system";
  body: string;
  whatsappMessageId?: string | null;
  deliveryStatus?: string | null;
  status?: string;
  createdAt: string;
  isOwn: boolean;
};

const BASE = "/conversations";

export const chatApi = {
  status: () =>
    api.get<{ mode: string; webhookUrl: string; missingEnv?: string[] }>(`${BASE}/status`).then((r) => r.data),

  listConversations: () =>
    api.get<ChatConversationRow[]>(BASE).then((r) => r.data),

  listAllAdmin: () =>
    api.get<ChatConversationRow[]>(`${BASE}/admin/all`).then((r) => r.data),

  listByRfq: (opts: { workspaceRfqId?: string; freightIqRfqId?: string }) =>
    api
      .get<ChatConversationRow[]>(`${BASE}/by-rfq`, { params: opts })
      .then((r) => r.data),

  listWorkspaceConversations: (contextType: "RFQ" | "ORDER_FREIGHT", contextWorkspaceId: string) =>
    api.get<ChatConversationRow[]>(`${BASE}/workspace/${contextType}/${contextWorkspaceId}`).then((r) => r.data),

  ensureRfq: (rfqWorkspaceId: string) =>
    api.post<ChatConversationRow[]>(`${BASE}/rfq/${rfqWorkspaceId}/ensure`).then((r) => r.data),

  syncOrderFreight: (orderWorkspaceId: string) =>
    api.post<ChatConversationRow[]>(`${BASE}/order/${orderWorkspaceId}/freight/sync`).then((r) => r.data),

  ensureOrderFreight: (orderWorkspaceId: string, forwarderContactId: string) =>
    api.post<{ id: string }>(`${BASE}/order/${orderWorkspaceId}/freight/${forwarderContactId}/ensure`).then((r) => r.data),

  getConversation: (id: string) =>
    api
      .get<{ conversation: ChatConversationRow & { contextType: string }; messages: ChatMessage[] }>(
        `${BASE}/${id}`,
      )
      .then((r) => r.data),

  sendMessage: (id: string, messageText: string) =>
    api.post<ChatMessage>(`${BASE}/${id}/messages`, { messageText }).then((r) => r.data),
};
