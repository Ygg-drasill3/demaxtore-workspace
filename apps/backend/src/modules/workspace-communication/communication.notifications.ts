import type { Prisma } from "@prisma/client";

export async function notifyCommEvent(
  tx: Prisma.TransactionClient,
  input: {
    userIds: string[];
    auditWorkspaceId: string;
    eventType: string;
    title: string;
    message: string;
    link: string;
  },
): Promise<void> {
  if (!input.userIds.length) return;
  await tx.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      workspaceId: input.auditWorkspaceId,
      eventType: input.eventType,
      type: "INFO" as const,
      title: input.title,
      message: input.message,
      link: input.link,
      isRead: false,
    })),
  });
}
