import type { PrismaClient, ControlTowerAlert as PrismaAlert, Workspace } from "@prisma/client";
import type { ControlTowerAlert } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { collectTradeGraph, resolveTradeRoot } from "../trade/trade.resolver.js";
import { toAlertDto } from "./control-tower.mapper.js";

type AlertRow = PrismaAlert & { workspace?: Pick<Workspace, "externalRef"> | null };

async function emitToTradeParticipants(
  db: PrismaClient,
  workspaceId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const root = await resolveTradeRoot(db, workspaceId);
  if (!root) return;
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
export async function broadcastControlTowerAlertCreated(
  db: PrismaClient,
  row: AlertRow,
): Promise<void> {
  const payload: { alert: ControlTowerAlert } = { alert: toAlertDto(row) };
  socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
  if (row.workspaceId) {
    socketBus.emitToWorkspace(row.workspaceId, SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
    await emitToTradeParticipants(db, row.workspaceId, SocketEvents.CONTROL_TOWER_ALERT_CREATED, payload);
  }
}

/** Maritime delay — notify workspace subscribers and trade participants. */
export async function broadcastShipmentTrackingDelay(
  db: PrismaClient,
  workspaceId: string,
  delayFlag: string | null | undefined,
): Promise<void> {
  const payload = { workspaceId, delayFlag };
  socketBus.emitToWorkspace(workspaceId, SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
  socketBus.emitToRole("ADMIN", SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
  await emitToTradeParticipants(db, workspaceId, SocketEvents.SHIPMENT_TRACKING_DELAY, payload);
}
