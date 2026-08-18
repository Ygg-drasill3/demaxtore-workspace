import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { collectTradeGraph, resolveTradeRoot } from "../trade/trade.resolver.js";
import { toAlertDto } from "./control-tower.mapper.js";
async function emitToTradeParticipants(db, workspaceId, event, payload) {
    const root = await resolveTradeRoot(db, workspaceId);
    if (!root)
        return;
    const graph = await collectTradeGraph(db, root);
    const participants = await db.workspaceParticipant.findMany({
        where: { workspaceId: { in: graph.allWorkspaceIds }, leftAt: null },
        select: { userId: true },
        distinct: ["userId"],
    });
    for (const p of participants) {
        socketBus.emitToUser(p.userId, event, payload);
    }
}
/** Push alert to admin, workspace room, and trade participants (buyer/supplier). */
export async function broadcastControlTowerAlertCreated(db, row) {
    const payload = { alert: toAlertDto(row) };
    socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
    if (row.workspaceId) {
        socketBus.emitToWorkspace(row.workspaceId, SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
        await emitToTradeParticipants(db, row.workspaceId, SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
    }
}
/** Maritime delay — notify workspace subscribers and trade participants. */
export async function broadcastShipmentTrackingDelay(db, workspaceId, delayFlag) {
    const payload = { workspaceId, delayFlag };
    socketBus.emitToWorkspace(workspaceId, SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
    socketBus.emitToRole("ADMIN", SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
    await emitToTradeParticipants(db, workspaceId, SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
}
//# sourceMappingURL=control-tower.socket.js.map