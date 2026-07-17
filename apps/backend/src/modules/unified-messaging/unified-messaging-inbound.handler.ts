import type { PrismaClient } from "@prisma/client";
import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { mapWhatsAppStatusToCanonical } from "./messaging-status.js";

/** Mirrors WhatsApp webhook payloads into unified workspace_messages when write mode allows. */
export class UnifiedMessagingInboundHandler {
  constructor(private readonly prisma: PrismaClient) {}

  async mirrorWhatsAppInboxResult(inboxResult: {
    conversationId?: string;
    messageId?: string;
    metaMessageId?: string;
    direction?: string;
    body?: string;
  }) {
    const mode = getUnifiedMessagingWriteMode();
    if (mode === "legacy_only") return;

    if (!inboxResult.conversationId || !inboxResult.messageId) return;

    try {
      let unifiedConv = await this.prisma.workspaceConversation.findFirst({
        where: { metadata: { path: ["whatsappConversationId"], equals: inboxResult.conversationId } },
      });

      if (!unifiedConv) {
        unifiedConv = await this.prisma.workspaceConversation.create({
          data: {
            workspaceType: "WHATSAPP",
            workspaceId: inboxResult.conversationId,
            primaryChannel: "WHATSAPP",
            metadata: { whatsappConversationId: inboxResult.conversationId },
          },
        });
      }

      const legacyId = inboxResult.messageId;
      const existing = await this.prisma.workspaceMessage.findFirst({
        where: { legacySource: "whatsapp", legacyId },
      });
      if (existing) return;

      if (inboxResult.metaMessageId) {
        const dup = await this.prisma.workspaceMessage.findFirst({
          where: { externalMessageId: inboxResult.metaMessageId },
        });
        if (dup) return;
      }

      await this.prisma.workspaceMessage.create({
        data: {
          conversationId: unifiedConv.id,
          messageType: "MESSAGE",
          visibility: "ALL_PARTICIPANTS",
          audienceScope: "EXTERNAL",
          direction: inboxResult.direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
          channelSource: "WHATSAPP",
          body: inboxResult.body ?? "",
          legacySource: "whatsapp",
          legacyId,
          externalMessageId: inboxResult.metaMessageId,
          whatsappMessageId: inboxResult.metaMessageId,
        },
      });
    } catch (err) {
      logger.warn({ err: String(err) }, "unified whatsapp inbound mirror failed");
    }
  }

  async mirrorDeliveryStatus(metaMessageId: string, status: string) {
    const mode = getUnifiedMessagingWriteMode();
    if (mode === "legacy_only") return;

    const msg = await this.prisma.workspaceMessage.findFirst({
      where: { externalMessageId: metaMessageId },
    });
    if (!msg) return;

    const canonical = mapWhatsAppStatusToCanonical(status);
    const now = new Date();
    const data: Record<string, Date> = {};
    if (canonical === "SENT") data.sentAt = now;
    if (canonical === "DELIVERED") data.deliveredAt = now;
    if (canonical === "READ") data.readAt = now;
    if (canonical === "FAILED") data.failedAt = now;

    if (Object.keys(data).length === 0) return;
    await this.prisma.workspaceMessage.update({ where: { id: msg.id }, data });
  }
}
