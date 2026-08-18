export async function notifyFreightEvent(tx, input) {
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
//# sourceMappingURL=freightiq.notifications.js.map