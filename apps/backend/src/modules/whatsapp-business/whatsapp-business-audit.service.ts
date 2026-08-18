import type { Prisma, PrismaClient } from "@prisma/client";

export type WhatsAppAuditAction =
  | "WHATSAPP_CONNECTED"
  | "WHATSAPP_RECONNECTED"
  | "WHATSAPP_DISCONNECTED"
  | "WHATSAPP_TOKEN_REVOKED"
  | "WHATSAPP_CONNECTION_ERROR"
  | "WHATSAPP_OUTBOUND_BLOCKED"
  | "WHATSAPP_HEALTH_CHECK_OK"
  | "WHATSAPP_HEALTH_CHECK_FAILED"
  | "WHATSAPP_INBOUND_UNRESOLVED"
  | "WHATSAPP_INBOUND_DISCONNECTED"
  | "WHATSAPP_ADMIN_CONVERSATION_VIEWED";

export async function logWhatsAppConnectionAudit(
  db: PrismaClient,
  input: {
    buyerId: string;
    connectionId?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
    action: WhatsAppAuditAction;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await db.whatsAppConnectionAuditLog.create({
    data: {
      buyerId: input.buyerId,
      connectionId: input.connectionId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      detail: (input.detail ?? {}) as Prisma.InputJsonValue,
    },
  });
}

/** Mask phone number for admin display: +905xx***xx67 */
export function maskPhoneForAdmin(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `+${digits.slice(0, 5)}***${digits.slice(-2)}`;
}

/** Mask Meta IDs for admin display. */
export function maskMetaId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.length <= 8) return "***";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
