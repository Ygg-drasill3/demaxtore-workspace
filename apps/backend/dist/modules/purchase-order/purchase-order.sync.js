import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { notifyPoEvent } from "./purchase-order.notifications.js";
/** Accept linked PO when supplier confirms the order (commercial terms accepted). */
export async function autoAcknowledgePoOnSupplierConfirm(tx, orderId, actor, notes = "Auto-acknowledged on order confirmation") {
    const po = await tx.purchaseOrder.findUnique({
        where: { orderId },
        include: { acknowledgements: true },
    });
    if (!po)
        return false;
    if (po.acknowledgements.some((a) => a.status === "ACCEPTED"))
        return false;
    if (!["SUBMITTED", "ISSUED"].includes(po.status))
        return false;
    const pending = po.acknowledgements.find((a) => a.status === "PENDING");
    if (pending) {
        await tx.purchaseOrderAcknowledgement.update({
            where: { id: pending.id },
            data: { status: "ACCEPTED", supplierUserId: actor.id, notes },
        });
    }
    else {
        await tx.purchaseOrderAcknowledgement.create({
            data: {
                purchaseOrderId: po.id,
                supplierUserId: actor.id,
                status: "ACCEPTED",
                notes,
            },
        });
    }
    await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "APPROVED", version: { increment: 1 } },
    });
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: orderId }, select: { state: true } });
    await tx.auditLog.create({
        data: {
            workspaceId: orderId,
            actorUserId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: "po.acknowledged",
            fromState: ws.state,
            toState: ws.state,
            payload: { poId: po.id, status: "ACCEPTED", auto: true },
        },
    });
    await tx.timelineEvent.create({
        data: {
            workspaceId: orderId,
            eventType: "po.acknowledged",
            actorUserId: actor.id,
            payload: { poId: po.id, status: "ACCEPTED", auto: true },
        },
    });
    const participants = await tx.workspaceParticipant.findMany({
        where: { workspaceId: orderId, leftAt: null },
    });
    await notifyPoEvent(tx, {
        orderId,
        userIds: participants.map((p) => p.userId).filter((id) => id !== actor.id),
        title: "PO acknowledged",
        message: `PO ${po.poNumber} acknowledged (order confirmed)`,
    });
    socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.PO_ACKNOWLEDGED, {
            poId: po.id,
            orderId,
            status: "ACCEPTED",
        });
    });
    return true;
}
//# sourceMappingURL=purchase-order.sync.js.map