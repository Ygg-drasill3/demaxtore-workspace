import type { Prisma, PrismaClient } from "@prisma/client";
import { socketBus } from "../../realtime/socket-bus.js";

const SYSTEM_ACTOR = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "system@demaxtore.local",
  role: "SYSTEM",
};

/** When a spawned order closes, mark the parent RFQ as CLOSED (fulfilled). */
export async function closeParentRfqWhenOrderCloses(
  tx: Prisma.TransactionClient,
  orderWorkspaceId: string,
  orderExternalRef: string,
): Promise<boolean> {
  const orderWs = await tx.workspace.findUnique({
    where: { id: orderWorkspaceId },
    select: { spawnedFromId: true, type: true },
  });
  if (!orderWs?.spawnedFromId || orderWs.type !== "ORDER") return false;

  const parent = await tx.workspace.findUnique({
    where: { id: orderWs.spawnedFromId },
    select: { id: true, type: true, state: true, externalRef: true },
  });
  if (!parent || parent.type !== "RFQ" || parent.state !== "PO_ISSUED") return false;

  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);

  await tx.workspace.update({
    where: { id: parent.id },
    data: { state: "CLOSED" },
  });

  const timelineEvent = await tx.timelineEvent.create({
    data: {
      workspaceId: parent.id,
      eventType: "rfq.order_fulfilled",
      actorUserId: null,
      payload: {
        orderId: orderWorkspaceId,
        orderRef: orderExternalRef,
        auto: true,
      } as Prisma.InputJsonValue,
    },
  });

  await tx.auditLog.create({
    data: {
      workspaceId: parent.id,
      actorUserId: SYSTEM_ACTOR.id,
      actorEmail: SYSTEM_ACTOR.email,
      actorRole: SYSTEM_ACTOR.role,
      action: "sync_order_closed",
      fromState: "PO_ISSUED",
      toState: "CLOSED",
      payload: {
        orderId: orderWorkspaceId,
        orderRef: orderExternalRef,
      } as Prisma.InputJsonValue,
    },
  });

  const owner = await tx.workspaceParticipant.findFirst({
    where: { workspaceId: parent.id, participantRole: "OWNER", leftAt: null },
    select: { userId: true },
  });
  if (owner) {
    await tx.notification.create({
      data: {
        userId: owner.userId,
        workspaceId: parent.id,
        type: "SUCCESS",
        title: "RFQ completed",
        message: `Order ${orderExternalRef} closed — ${parent.externalRef} is complete.`,
        link: `/workspace/rfq/${parent.id}`,
      },
    });
  }

  const timelineEventDTO = {
    id: timelineEvent.id,
    eventType: timelineEvent.eventType,
    actorUserId: timelineEvent.actorUserId,
    createdAt: timelineEvent.createdAt.toISOString(),
    payload: timelineEvent.payload as Record<string, unknown> | null,
  };

  socketBus.scheduleEmit(() => {
    socketBus.emitToWorkspace(parent.id, "rfq.state.changed", {
      workspaceId: parent.id,
      fromState: "PO_ISSUED",
      toState: "CLOSED",
      action: "sync_order_closed",
      actorUserId: null,
      occurredAt: new Date().toISOString(),
    });
    socketBus.emitToWorkspace(parent.id, "rfq.timeline.appended", {
      workspaceId: parent.id,
      event: timelineEventDTO,
    });
    socketBus.emitToWorkspace(parent.id, "timeline:new", { workspaceId: parent.id, event: timelineEventDTO });
    socketBus.emitToWorkspace(parent.id, "workspace:update", {
      workspaceId: parent.id,
      state: "CLOSED",
      action: "sync_order_closed",
    });
  });

  return true;
}

/** Backfill RFQs left at PO_ISSUED after their spawned order was already closed. */
export async function repairRfqStateIfOrderClosed(
  db: PrismaClient,
  rfqWorkspaceId: string,
): Promise<boolean> {
  const rfq = await db.workspace.findUnique({
    where: { id: rfqWorkspaceId },
    select: { state: true, type: true },
  });
  if (!rfq || rfq.type !== "RFQ" || rfq.state !== "PO_ISSUED") return false;

  const order = await db.workspace.findFirst({
    where: { spawnedFromId: rfqWorkspaceId, type: "ORDER", state: "CLOSED" },
    select: { id: true, externalRef: true },
    orderBy: { createdAt: "desc" },
  });
  if (!order) return false;

  return db.$transaction((tx) =>
    closeParentRfqWhenOrderCloses(tx, order.id, order.externalRef),
  );
}
