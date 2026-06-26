import type { DirectConversation, DirectMessage } from "@prisma/client";
import type { MessageSource, MessageStatus, SenderType } from "./chat.types.js";
import { isAdminChatRole } from "./chat.types.js";

type ConvRow = Pick<
  DirectConversation,
  | "id"
  | "contextType"
  | "contextWorkspaceId"
  | "contextRef"
  | "workspaceRfqId"
  | "freightIqRfqId"
  | "buyerUserId"
  | "peerUserId"
  | "peerName"
  | "peerPhone"
  | "whatsappPhone"
  | "forwarderPhone"
  | "forwarderContactId"
  | "status"
  | "updatedAt"
>;

export function resolveSenderType(
  actorRole: string,
  conv: Pick<DirectConversation, "buyerUserId" | "peerUserId" | "forwarderContactId">,
  authorUserId: string | null,
): SenderType {
  if (isAdminChatRole(actorRole)) return "admin";
  if (!authorUserId) {
    return conv.forwarderContactId ? "forwarder" : "supplier";
  }
  if (authorUserId === conv.buyerUserId) return "buyer";
  if (authorUserId === conv.peerUserId) return "supplier";
  return "buyer";
}

export function mapConversationRow(
  conv: ConvRow,
  extras: {
    peerName?: string;
    peerPhone?: string | null;
    lastMessage?: string | null;
    lastAt?: string | null;
    lastSource?: string | null;
  } = {},
) {
  return {
    conversationId: conv.id,
    id: conv.id,
    contextType: conv.contextType,
    contextWorkspaceId: conv.contextWorkspaceId,
    contextRef: conv.contextRef,
    workspaceRfqId: conv.workspaceRfqId,
    freightIqRfqId: conv.freightIqRfqId,
    buyerId: conv.buyerUserId,
    supplierId: conv.peerUserId,
    forwarderPhone: conv.forwarderPhone ?? conv.peerPhone,
    whatsappPhone: extras.peerPhone ?? conv.whatsappPhone ?? conv.peerPhone,
    peerName: extras.peerName ?? conv.peerName,
    peerPhone: extras.peerPhone ?? conv.whatsappPhone ?? conv.peerPhone,
    peerUserId: conv.peerUserId,
    forwarderContactId: conv.forwarderContactId,
    status: conv.status,
    lastMessage: extras.lastMessage ?? null,
    lastAt: extras.lastAt ?? conv.updatedAt.toISOString(),
    lastSource: extras.lastSource ?? null,
    workspaceUrl:
      conv.contextType === "RFQ"
        ? `/workspace/rfq/${conv.contextWorkspaceId}`
        : `/workspace/order/${conv.contextWorkspaceId}`,
  };
}

export function mapMessageRow(
  m: DirectMessage,
  conv: Pick<DirectConversation, "buyerUserId" | "peerUserId" | "forwarderContactId">,
  viewerUserId: string,
  viewerRole: string,
) {
  const source = (m.source || (m.channel === "whatsapp" ? "whatsapp" : "platform")) as MessageSource;
  const status = (m.status || m.deliveryStatus || "sent") as MessageStatus;
  const senderType = (m.senderType || resolveSenderType(viewerRole, conv, m.authorUserId)) as SenderType;

  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType,
    senderUserId: m.authorUserId,
    senderPhone: m.senderPhone,
    source,
    channel: source === "whatsapp" ? "whatsapp" : "panel",
    body: m.body,
    whatsappMessageId: m.whatsappMessageId,
    status,
    deliveryStatus: status,
    createdAt: m.createdAt.toISOString(),
    isOwn: m.authorUserId === viewerUserId,
  };
}

export function sourceLabel(source: MessageSource, senderType: SenderType): string {
  if (source === "whatsapp") return "WhatsApp";
  if (senderType === "admin") return "Admin";
  if (source === "system") return "System";
  return "Platform";
}
