import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { bootstrapWorkspaceConversation } from "../conversation-hub/conversation-bootstrap.js";
import {
  participantKeyForUser,
} from "../unified-messaging/unified-messaging.constants.js";
import { sendRfqWhatsAppOpeningInvite } from "../unified-messaging/unified-messaging.whatsapp-outbound.js";
import { resolveBuyerWhatsAppCredentials } from "../whatsapp-business/whatsapp-business-credential.resolver.js";
import type { WhatsAppTenantCredentials } from "../whatsapp-business/whatsapp-business.types.js";
import { isWhatsAppConfigured } from "../chat/whatsapp.service.js";

function resolveRfqOutreachCredentials(
  buyerCredentials: WhatsAppTenantCredentials | null,
): WhatsAppTenantCredentials | null {
  if (buyerCredentials) return buyerCredentials;
  if (!isWhatsAppConfigured()) return null;
  return {
    buyerId: "platform",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: env.WHATSAPP_ACCESS_TOKEN!,
    displayPhoneNumber: env.WHATSAPP_BUSINESS_PHONE_E164 ?? "",
    wabaId: "",
    metaBusinessId: "",
    verifiedName: null,
  };
}

/** Enable WhatsApp on the unified RFQ workspace conversation (idempotent). */
export async function enableRfqWhatsApp(db: PrismaClient, rfqWorkspaceId: string): Promise<void> {
  const ws = await db.workspace.findUnique({
    where: { id: rfqWorkspaceId },
    select: {
      type: true,
      externalRef: true,
      rfqDetails: { select: { title: true, selectedSupplierUserId: true } },
    },
  });
  if (!ws || ws.type !== "RFQ") return;

  await bootstrapWorkspaceConversation(db, "RFQ", rfqWorkspaceId);

  const conv = await db.workspaceConversation.findUnique({
    where: {
      workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: rfqWorkspaceId },
    },
  });
  if (!conv) return;

  const workspaceParts = await db.workspaceParticipant.findMany({
    where: { workspaceId: rfqWorkspaceId, leftAt: null },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          organisationId: true,
          whatsappPhone: true,
        },
      },
    },
  });

  const buyerOwner = workspaceParts.find((p) => p.participantRole === "OWNER");
  const buyerCredentials = buyerOwner
    ? await resolveBuyerWhatsAppCredentials(db, buyerOwner.userId)
    : null;
  const buyerPhoneNumberId = buyerCredentials?.phoneNumberId ?? env.WHATSAPP_PHONE_NUMBER_ID ?? "default";

  // Messaging is 1:1 — prefer awarded supplier, else first counterparty with WhatsApp.
  const preferredSupplierId = ws.rfqDetails?.selectedSupplierUserId ?? null;
  const counterparties = workspaceParts.filter((p) => p.participantRole === "COUNTERPARTY");
  const focusedSupplier =
    (preferredSupplierId
      ? counterparties.find((p) => p.userId === preferredSupplierId)
      : null) ??
    counterparties.find((p) => Boolean(normalizePhone(p.user.whatsappPhone))) ??
    null;

  const supplierUserId = focusedSupplier?.userId ?? null;
  const supplierWhatsAppPhone = focusedSupplier
    ? normalizePhone(focusedSupplier.user.whatsappPhone)
    : null;
  const hasSupplierPhone = Boolean(supplierWhatsAppPhone);
  const keepUserIds = new Set(
    [buyerOwner?.userId, supplierUserId].filter((id): id is string => Boolean(id)),
  );

  for (const p of workspaceParts) {
    const phone = normalizePhone(p.user.whatsappPhone);
    const shouldBeActive = keepUserIds.has(p.userId);

    let whatsappContactId: string | undefined;
    if (phone && shouldBeActive) {
      const contact = await db.whatsAppContact.upsert({
        where: { waId: phone },
        create: {
          waId: phone,
          phoneNumber: phone,
          profileName: p.user.displayName,
          userId: p.userId,
        },
        update: {
          profileName: p.user.displayName,
          userId: p.userId,
        },
      });
      whatsappContactId = contact.id;

      if (p.userId === supplierUserId) {
        const existingWa = await db.whatsAppConversation.findUnique({
          where: {
            contactId_phoneNumberId: {
              contactId: contact.id,
              phoneNumberId: buyerPhoneNumberId ?? "default",
            },
          },
          select: { id: true, workspaceRfqId: true },
        });
        // Never steal the shared WA conversation pointer from another RFQ.
        const canBindRfq =
          !existingWa?.workspaceRfqId || existingWa.workspaceRfqId === rfqWorkspaceId;
        await db.whatsAppConversation.upsert({
          where: {
            contactId_phoneNumberId: {
              contactId: contact.id,
              phoneNumberId: buyerPhoneNumberId ?? "default",
            },
          },
          create: {
            contactId: contact.id,
            phoneNumberId: buyerPhoneNumberId ?? "default",
            workspaceRfqId: rfqWorkspaceId,
            userId: buyerOwner?.userId ?? null,
          },
          update: {
            userId: buyerOwner?.userId ?? null,
            ...(canBindRfq ? { workspaceRfqId: rfqWorkspaceId } : {}),
          },
        });
      }
    }

    const participantKey = participantKeyForUser(p.userId);
    const participantRole = p.participantRole === "OWNER" ? "OWNER" : "MEMBER";
    await db.workspaceConversationParticipant.upsert({
      where: { conversationId_participantKey: { conversationId: conv.id, participantKey } },
      create: {
        conversationId: conv.id,
        participantKey,
        userId: p.userId,
        whatsappContactId: whatsappContactId ?? null,
        participantType: "USER",
        participantRole,
        companyId: p.user.organisationId,
        displayName: p.user.displayName,
        email: p.user.email,
        phoneE164: phone,
        leftAt: shouldBeActive ? null : new Date(),
      },
      update: {
        leftAt: shouldBeActive ? null : new Date(),
        whatsappContactId: whatsappContactId ?? null,
        companyId: p.user.organisationId,
        displayName: p.user.displayName,
        email: p.user.email,
        phoneE164: phone,
      },
    });
  }

  // Soft-leave any leftover members not in the 1:1 pair (never drop OWNER)
  if (keepUserIds.size > 0) {
    await db.workspaceConversationParticipant.updateMany({
      where: {
        conversationId: conv.id,
        leftAt: null,
        participantRole: { not: "OWNER" },
        OR: [{ userId: null }, { userId: { notIn: [...keepUserIds] } }],
      },
      data: { leftAt: new Date() },
    });
  }

  const hasContext = await db.conversationContext.findFirst({
    where: {
      conversationId: conv.id,
      contextType: "RFQ",
      contextId: rfqWorkspaceId,
    },
  });
  if (!hasContext) {
    await db.conversationContext.create({
      data: {
        conversationId: conv.id,
        contextType: "RFQ",
        contextId: rfqWorkspaceId,
        contextReference: ws.externalRef,
      },
    });
  }

  const subject = ws.rfqDetails?.title ?? ws.externalRef;
  const baseMeta =
    typeof conv.metadata === "object" && conv.metadata && !Array.isArray(conv.metadata)
      ? (conv.metadata as Prisma.JsonObject)
      : {};
  await db.workspaceConversation.update({
    where: { id: conv.id },
    data: {
      primaryChannel: "WHATSAPP",
      ...(subject ? { subject } : {}),
      metadata: {
        ...baseMeta,
        rfqWhatsAppEnabled: true,
        rfqWhatsAppReady: hasSupplierPhone,
        ...(buyerOwner ? { rfqBuyerUserId: buyerOwner.userId } : {}),
        ...(buyerPhoneNumberId ? { rfqBuyerPhoneNumberId: buyerPhoneNumberId } : {}),
        ...(supplierUserId ? { rfqSupplierUserId: supplierUserId } : {}),
        ...(preferredSupplierId ? { selectedSupplierUserId: preferredSupplierId } : {}),
        ...(supplierWhatsAppPhone ? { rfqSupplierWhatsAppPhone: supplierWhatsAppPhone } : {}),
      },
    },
  });

  const outreachCredentials = resolveRfqOutreachCredentials(buyerCredentials);
  if (hasSupplierPhone && supplierWhatsAppPhone && outreachCredentials) {
    void sendRfqWhatsAppOpeningInvite(
      db,
      rfqWorkspaceId,
      supplierWhatsAppPhone,
      ws.externalRef,
      outreachCredentials,
    ).catch(() => undefined);
  }
}
