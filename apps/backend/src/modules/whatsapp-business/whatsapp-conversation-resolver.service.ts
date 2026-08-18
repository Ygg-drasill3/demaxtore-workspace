import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizePhone } from "../chat/whatsapp.service.js";

export type ConversationResolutionResult =
  | { kind: "resolved"; workspaceConversationId: string; buyerId: string; supplierUserId?: string }
  | { kind: "ambiguous"; candidates: string[]; buyerId: string }
  | { kind: "unresolved"; reason: string; buyerId?: string };

/**
 * Resolve inbound WhatsApp webhook to a buyer workspace conversation.
 * Priority:
 * 1. Outbound message reply context (replyToMetaId → workspace message)
 * 2. Conversation metadata buyerId + supplier phone
 * 3. RFQ supplier assignment under buyer-owned workspace
 * 4. buyer phoneNumberId + supplier phone unique match
 */
export async function resolveInboundWorkspaceConversation(
  db: PrismaClient,
  input: {
    phoneNumberId: string;
    buyerId: string;
    supplierWaId: string;
    replyToMetaId?: string | null;
    whatsappConversationId?: string;
  },
): Promise<ConversationResolutionResult> {
  const supplierPhone = normalizePhone(input.supplierWaId);
  if (!supplierPhone) {
    return { kind: "unresolved", reason: "INVALID_SUPPLIER_PHONE" };
  }

  // 1. Reply context from prior outbound
  if (input.replyToMetaId) {
    const prior = await db.workspaceMessage.findFirst({
      where: {
        OR: [{ externalMessageId: input.replyToMetaId }, { whatsappMessageId: input.replyToMetaId }],
        direction: "OUTBOUND",
      },
      select: { conversationId: true },
    });
    if (prior) {
      const conv = await db.workspaceConversation.findUnique({
        where: { id: prior.conversationId },
        select: { id: true, metadata: true },
      });
      if (conv) {
        const meta = conv.metadata as Record<string, unknown> | null;
        const metaBuyerId = typeof meta?.buyerId === "string" ? meta.buyerId : input.buyerId;
        if (metaBuyerId === input.buyerId) {
          return { kind: "resolved", workspaceConversationId: conv.id, buyerId: input.buyerId };
        }
      }
    }
  }

  // 2. Metadata-linked conversations for this buyer + supplier phone
  const metadataMatches = await db.workspaceConversation.findMany({
    where: {
      OR: [
        { metadata: { path: ["buyerId"], equals: input.buyerId } },
        { metadata: { path: ["buyerWhatsAppPhoneNumberId"], equals: input.phoneNumberId } },
      ],
    },
    select: { id: true, metadata: true },
    take: 20,
  });

  const supplierMatches = metadataMatches.filter((c) => {
    const meta = c.metadata as Record<string, unknown> | null;
    const metaPhone = normalizePhone(
      typeof meta?.rfqSupplierWhatsAppPhone === "string" ? meta.rfqSupplierWhatsAppPhone : null,
    );
    return metaPhone === supplierPhone;
  });

  if (supplierMatches.length === 1) {
    return {
      kind: "resolved",
      workspaceConversationId: supplierMatches[0]!.id,
      buyerId: input.buyerId,
    };
  }
  if (supplierMatches.length > 1) {
    return {
      kind: "ambiguous",
      candidates: supplierMatches.map((c) => c.id),
      buyerId: input.buyerId,
    };
  }

  // 3. RFQ workspaces owned by buyer with supplier assignment
  const buyerWorkspaces = await db.workspaceParticipant.findMany({
    where: {
      userId: input.buyerId,
      participantRole: "OWNER",
      leftAt: null,
      workspace: { type: "RFQ" },
    },
    select: { workspaceId: true },
  });

  const rfqCandidates: string[] = [];
  for (const wp of buyerWorkspaces) {
    const supplierPart = await db.workspaceParticipant.findFirst({
      where: {
        workspaceId: wp.workspaceId,
        leftAt: null,
        participantRole: "COUNTERPARTY",
        user: { whatsappPhone: { not: null } },
      },
      include: { user: { select: { whatsappPhone: true, id: true } } },
    });
    const partPhone = normalizePhone(supplierPart?.user.whatsappPhone);
    if (partPhone !== supplierPhone) continue;

    const wsConv = await db.workspaceConversation.findUnique({
      where: {
        workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: wp.workspaceId },
      },
      select: { id: true },
    });
    if (wsConv) rfqCandidates.push(wsConv.id);
  }

  if (rfqCandidates.length === 1) {
    return {
      kind: "resolved",
      workspaceConversationId: rfqCandidates[0]!,
      buyerId: input.buyerId,
    };
  }
  if (rfqCandidates.length > 1) {
    return { kind: "ambiguous", candidates: rfqCandidates, buyerId: input.buyerId };
  }

  // 4. WhatsApp conversation workspaceRfqId link
  if (input.whatsappConversationId) {
    const waConv = await db.whatsAppConversation.findUnique({
      where: { id: input.whatsappConversationId },
      select: { workspaceRfqId: true, userId: true },
    });
    if (waConv?.workspaceRfqId && waConv.userId === input.buyerId) {
      const wsConv = await db.workspaceConversation.findUnique({
        where: {
          workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: waConv.workspaceRfqId },
        },
        select: { id: true },
      });
      if (wsConv) {
        return {
          kind: "resolved",
          workspaceConversationId: wsConv.id,
          buyerId: input.buyerId,
        };
      }
    }
  }

  return {
    kind: "unresolved",
    reason: "NO_UNIQUE_CONVERSATION_MATCH",
    buyerId: input.buyerId,
  };
}

export async function recordUnresolvedWebhook(
  db: PrismaClient,
  input: {
    phoneNumberId: string;
    buyerId?: string;
    supplierWaId?: string;
    metaMessageId?: string;
    reason: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  if (input.metaMessageId) {
    const existing = await db.whatsAppUnresolvedWebhookEvent.findUnique({
      where: { metaMessageId: input.metaMessageId },
    });
    if (existing) return;
  }

  await db.whatsAppUnresolvedWebhookEvent.create({
    data: {
      phoneNumberId: input.phoneNumberId,
      buyerId: input.buyerId ?? null,
      supplierWaId: input.supplierWaId ?? null,
      metaMessageId: input.metaMessageId ?? null,
      reason: input.reason,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}
