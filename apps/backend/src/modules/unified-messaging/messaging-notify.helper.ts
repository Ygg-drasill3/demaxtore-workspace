import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

export function messagingDedupKey(
  eventType: string,
  conversationId: string,
  messageId: string,
  recipientId: string,
): string {
  return createHash("sha256")
    .update(`messaging:${eventType}:${conversationId}:${messageId}:${recipientId}`)
    .digest("hex")
    .slice(0, 32);
}

export function messagingDedupMetadata(
  eventType: string,
  conversationId: string,
  messageId: string,
  recipientId: string,
): Record<string, string> {
  return { messagingDedupKey: messagingDedupKey(eventType, conversationId, messageId, recipientId) };
}

/** Filter recipients that already received this messaging notification. */
export async function filterRecipientsForMessagingDedup(
  tx: Prisma.TransactionClient,
  input: {
    eventType: string;
    conversationId: string;
    messageId: string;
    userIds: string[];
  },
): Promise<string[]> {
  if (!input.userIds.length) return [];
  const out: string[] = [];
  for (const userId of input.userIds) {
    const hash = messagingDedupKey(input.eventType, input.conversationId, input.messageId, userId);
    const existing = await tx.notification.findFirst({
      where: { metadata: { path: ["messagingDedupKey"], equals: hash } },
      select: { id: true },
    });
    if (!existing) out.push(userId);
  }
  return out;
}

/** Skip delivery-status notifications except FAILED for staff. */
export function shouldEmitDeliveryNotification(status: string): boolean {
  return status.toUpperCase() === "FAILED";
}
