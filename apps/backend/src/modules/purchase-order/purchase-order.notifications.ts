import type { Prisma } from "@prisma/client";
import { sendCriticalEmailAsync } from "../messaging/critical-events.js";

export async function notifyPoEvent(
  tx: Prisma.TransactionClient,
  input: { orderId: string; userIds: string[]; title: string; message: string; email?: boolean },
): Promise<void> {
  if (!input.userIds.length) return;
  await tx.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      workspaceId: input.orderId,
      type: "INFO",
      title: input.title,
      message: input.message,
      isRead: false,
      link: `/workspace/order/${input.orderId}`,
    })),
  });
  if (input.email) {
    const users = await tx.user.findMany({
      where: { id: { in: input.userIds } },
      select: { email: true },
    });
    for (const u of users) {
      sendCriticalEmailAsync(u.email, input.title, input.message);
    }
  }
}
