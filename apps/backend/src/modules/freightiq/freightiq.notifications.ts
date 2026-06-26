import type { Prisma } from "@prisma/client";

export async function notifyFreightEvent(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    orderRef: string;
    userIds: string[];
    title: string;
    message: string;
  },
): Promise<number> {
  let n = 0;
  for (const userId of input.userIds) {
    await tx.notification.create({
      data: {
        userId,
        workspaceId: input.orderId,
        type: "INFO",
        title: input.title,
        message: input.message,
        link: `/workspace/order/${input.orderId}`,
      },
    });
    n++;
  }
  return n;
}
