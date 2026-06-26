import type { Prisma } from "@prisma/client";

export async function notifyDocumentEvent(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    userIds: string[];
    title: string;
    message: string;
  },
): Promise<void> {
  if (!input.userIds.length) return;
  await tx.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      workspaceId: input.workspaceId,
      type: "INFO",
      title: input.title,
      message: input.message,
      read: false,
    })),
  });
}
