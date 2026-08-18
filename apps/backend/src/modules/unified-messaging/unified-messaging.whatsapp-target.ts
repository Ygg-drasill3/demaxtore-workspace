import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { Validation } from "../../lib/errors.js";
import { normalizePhone } from "../chat/whatsapp.service.js";
import { DEMAXTORE_WHATSAPP_BUSINESS_DISPLAY } from "./unified-messaging.whatsapp-outbound.js";
import type { AuthUser } from "./unified-messaging.types.js";

const STAFF_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "SALES_MANAGER"]);

function phoneFromUser(user: { whatsappPhone: string | null } | null | undefined): string | null {
  return normalizePhone(user?.whatsappPhone);
}

/** E.164 digits for the DeMaxtore WhatsApp Business sender line (never a valid recipient). */
export function getWhatsAppBusinessPhoneE164(): string {
  const fromEnv = env.WHATSAPP_BUSINESS_PHONE_E164?.trim();
  const normalized = normalizePhone(fromEnv ?? DEMAXTORE_WHATSAPP_BUSINESS_DISPLAY);
  return normalized ?? "905518659442";
}

/** Mask phone for logs/tests: +905xx***xx67 */
export function maskPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  const prefix = digits.slice(0, 5);
  const suffix = digits.slice(-2);
  return `+${prefix}***${suffix}`;
}

export function assertWhatsAppRecipientAllowed(
  recipientPhone: string,
  sender: AuthUser,
  senderPhones: { whatsappPhone?: string | null; phoneNumber?: string | null },
): void {
  const recipient = normalizePhone(recipientPhone);
  if (!recipient) {
    throw Validation("Invalid WhatsApp recipient phone number.");
  }

  const business = getWhatsAppBusinessPhoneE164();
  if (recipient === business) {
    throw Validation(
      "Cannot use the DeMaxtore WhatsApp Business line as message recipient.",
      { recipientMasked: maskPhoneE164(recipient), blocked: "business_line" },
    );
  }

  const senderWa = normalizePhone(senderPhones.whatsappPhone);
  const senderPn = normalizePhone(senderPhones.phoneNumber);
  if (recipient === senderWa || recipient === senderPn) {
    throw Validation("Cannot send a WhatsApp message to your own phone number.", {
      recipientMasked: maskPhoneE164(recipient),
      blocked: "sender_own_phone",
    });
  }
}

/** RFQ / supplier conversations always route external messages through WhatsApp. */
export async function isSupplierConversation(
  prisma: PrismaClient,
  conversationId: string,
): Promise<boolean> {
  const conv = await prisma.workspaceConversation.findUnique({
    where: { id: conversationId },
    include: {
      contexts: { where: { contextType: "RFQ" }, take: 1 },
      participants: {
        where: { leftAt: null, participantRole: "COUNTERPARTY" },
        take: 1,
      },
    },
  });
  if (!conv) return false;
  return conv.contexts.length > 0 || conv.participants.length > 0;
}

async function resolveRfqWhatsAppTarget(
  prisma: PrismaClient,
  workspaceId: string,
  sender: AuthUser,
): Promise<string | null> {
  const wsParts = await prisma.workspaceParticipant.findMany({
    where: { workspaceId, leftAt: null },
    include: { user: { select: { id: true, whatsappPhone: true } } },
  });

  const senderPart = wsParts.find((p) => p.userId === sender.id);
  const isSupplierSide =
    sender.role === "SUPPLIER" || senderPart?.participantRole === "COUNTERPARTY";

  if (isSupplierSide) {
    if (sender.role === "SUPPLIER") {
      const direct = await prisma.user.findUnique({
        where: { id: sender.id },
        select: { whatsappPhone: true },
      });
      const ownPhone = phoneFromUser(direct) ?? phoneFromUser(senderPart?.user);
      if (ownPhone) return ownPhone;
    }
    const counterparty = wsParts.find((p) => p.participantRole === "COUNTERPARTY");
    const counterpartyPhone = phoneFromUser(counterparty?.user);
    if (counterpartyPhone) return counterpartyPhone;
    const owner = wsParts.find((p) => p.participantRole === "OWNER");
    return phoneFromUser(owner?.user);
  }

  const rfq = await prisma.rfqDetails.findUnique({
    where: { workspaceId },
    select: { selectedSupplierUserId: true },
  });
  if (rfq?.selectedSupplierUserId) {
    const selected = await prisma.user.findUnique({
      where: { id: rfq.selectedSupplierUserId },
      select: { whatsappPhone: true },
    });
    const phone = phoneFromUser(selected);
    if (phone) return phone;
  }

  for (const p of wsParts.filter((x) => x.participantRole === "COUNTERPARTY")) {
    const phone = phoneFromUser(p.user);
    if (phone) return phone;
  }

  const assignments = await prisma.supplierAssignment.findMany({
    where: { workspaceId, removedAt: null },
    select: { supplierUserId: true },
  });
  for (const a of assignments) {
    const u = await prisma.user.findUnique({
      where: { id: a.supplierUserId },
      select: { whatsappPhone: true },
    });
    const phone = phoneFromUser(u);
    if (phone) return phone;
  }

  return null;
}

/** Resolve counterparty WhatsApp phone for outbound unified messages. */
export async function resolveWhatsAppTargetPhone(
  prisma: PrismaClient,
  conversationId: string,
  sender: AuthUser,
): Promise<string | null> {
  const conv = await prisma.workspaceConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { where: { leftAt: null } },
      contexts: true,
    },
  });
  if (!conv) return null;

  const meta =
    typeof conv.metadata === "object" && conv.metadata && !Array.isArray(conv.metadata)
      ? (conv.metadata as Record<string, unknown>)
      : {};
  const metaPhone = normalizePhone(
    typeof meta.rfqSupplierWhatsAppPhone === "string" ? meta.rfqSupplierWhatsAppPhone : null,
  );

  const rfqContext = conv.contexts.find((c) => c.contextType === "RFQ");
  if (rfqContext) {
    const phone = await resolveRfqWhatsAppTarget(prisma, rfqContext.contextId, sender);
    if (phone) return phone;
    if (sender.role === "BUYER" || sender.role === "SUPPLIER") {
      return null;
    }
  }

  if (sender.role === "SUPPLIER") {
    const self = conv.participants.find((p) => p.userId === sender.id);
    if (self?.userId) {
      const supplier = await prisma.user.findUnique({
        where: { id: self.userId },
        select: { whatsappPhone: true },
      });
      return phoneFromUser(supplier);
    }
  }

  if (STAFF_ROLES.has(sender.role) && metaPhone) {
    return metaPhone;
  }

  if (STAFF_ROLES.has(sender.role)) {
    const others = conv.participants.filter((p) => p.userId && p.userId !== sender.id);
    for (const p of others) {
      if (p.participantRole === "OWNER") continue;
      if (p.userId) {
        const user = await prisma.user.findUnique({
          where: { id: p.userId },
          select: { whatsappPhone: true },
        });
        const fromUser = phoneFromUser(user);
        if (fromUser) return fromUser;
      }
    }
  }

  return STAFF_ROLES.has(sender.role) ? metaPhone : null;
}

/** Format digits as +90 … for UI display. */
export function formatWhatsAppPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone.startsWith("+") ? phone : `+${digits}`;
}
