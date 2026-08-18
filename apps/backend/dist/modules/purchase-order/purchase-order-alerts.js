import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
const H_72 = 72 * 3_600_000;
export async function scanPurchaseOrderAlerts(db) {
    let n = 0;
    const now = new Date();
    const cutoff = new Date(now.getTime() - H_72);
    const noAck = await db.purchaseOrder.findMany({
        where: {
            status: "SUBMITTED",
            issuedAt: { lte: cutoff },
        },
        take: 50,
    });
    for (const po of noAck) {
        const hasAck = await db.purchaseOrderAcknowledgement.findFirst({
            where: { purchaseOrderId: po.id, status: "ACCEPTED" },
        });
        if (hasAck)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: po.orderId,
            alertKey: AlertKey.PO_NO_ACK_72H,
            severity: "WARNING",
            category: "ORDER",
            workspaceType: "ORDER",
            title: "PO issued without acknowledgement",
            description: `PO ${po.poNumber} has no supplier acknowledgement (>72h).`,
        }))
            n++;
    }
    const openAmendments = await db.purchaseOrderAmendment.findMany({
        where: { status: "OPEN", createdAt: { lte: cutoff } },
        include: { purchaseOrder: true },
        take: 50,
    });
    for (const a of openAmendments) {
        if (await upsertControlTowerAlert(db, {
            workspaceId: a.purchaseOrder.orderId,
            alertKey: AlertKey.PO_AMENDMENT_OPEN_72H,
            severity: "WARNING",
            category: "ORDER",
            workspaceType: "ORDER",
            title: "PO amendment open",
            description: `Amendment pending on PO ${a.purchaseOrder.poNumber} (>72h).`,
        }))
            n++;
    }
    const cancelled = await db.purchaseOrder.findMany({
        where: { status: "CANCELLED", updatedAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } },
        take: 30,
    });
    for (const po of cancelled) {
        const rejected = await db.purchaseOrderAcknowledgement.findFirst({
            where: { purchaseOrderId: po.id, status: "REJECTED" },
        });
        const key = rejected ? AlertKey.PO_REJECTED : AlertKey.PO_CANCELLED;
        const title = rejected ? "PO rejected by supplier" : "PO cancelled";
        if (await upsertControlTowerAlert(db, {
            workspaceId: po.orderId,
            alertKey: key,
            severity: "CRITICAL",
            category: "ORDER",
            workspaceType: "ORDER",
            title,
            description: `PO ${po.poNumber} — ${title.toLowerCase()}.`,
        }))
            n++;
    }
    return n;
}
//# sourceMappingURL=purchase-order-alerts.js.map