import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { prisma } from "../../db/prisma.js";
import { spawnShipmentFromOrder } from "../shipment/shipment.spawn.js";

vi.mock("../../config/orchestrator.js", () => ({
  isOrchestratorEnabled: () => true,
  isOrchestratorShadowMode: () => true,
  isOrchestratorAutoApply: () => false,
  orchestratorConfigForClient: () => ({
    enabled: true,
    shadowMode: true,
    autoApply: false,
    hideOrderLogisticsActions: false,
  }),
}));

const createdIds: { orders: string[]; shipments: string[] } = { orders: [], shipments: [] };

async function setWorkspaceState(workspaceId: string, state: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
    await tx.workspace.update({ where: { id: workspaceId }, data: { state } });
  });
}

async function createPair(orderState: string, shipmentState: string) {
  const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@dema.test" } });
  const supplier = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@acme-mfg.test" } });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderRef = `ORD-ORCH-${suffix}`;

  const order = await prisma.workspace.create({
    data: {
      externalRef: orderRef,
      type: "ORDER",
      state: "FREIGHT_REQUESTED",
      currency: "USD",
      createdById: buyer.id,
      participants: {
        create: [
          { userId: buyer.id, participantRole: "OWNER" },
          { userId: supplier.id, participantRole: "COUNTERPARTY" },
        ],
      },
    },
  });
  createdIds.orders.push(order.id);

  const spawned = await prisma.$transaction((tx) =>
    spawnShipmentFromOrder(tx, {
      orderWorkspaceId: order.id,
      orderExternalRef: orderRef,
      contractRef: `CTR-${suffix}`,
      currency: "USD",
      buyerUserId: buyer.id,
      supplierUserId: supplier.id,
      originPort: "CNSHA",
      destinationPort: "NLRTM",
      actorUserId: buyer.id,
    }),
  );
  createdIds.shipments.push(spawned.shipmentWorkspaceId);

  await setWorkspaceState(order.id, orderState);
  await setWorkspaceState(spawned.shipmentWorkspaceId, shipmentState);

  return { orderId: order.id, shipmentId: spawned.shipmentWorkspaceId, orderRef };
}

async function loadOrchestrator() {
  const { OrderShipmentOrchestrator } = await import("./order-shipment-orchestrator.service.js");
  return new OrderShipmentOrchestrator(prisma);
}

describe("OrderShipmentOrchestrator integration", () => {
  beforeAll(async () => {
    await prisma.user.findUniqueOrThrow({ where: { email: "buyer@dema.test" } });
  });

  afterEach(async () => {
    const allIds = [...createdIds.orders, ...createdIds.shipments];
    if (allIds.length === 0) return;

    await prisma.orchestratorRecommendation.deleteMany({
      where: { OR: [{ orderId: { in: createdIds.orders } }, { shipmentId: { in: createdIds.shipments } }] },
    });
    await prisma.processedEvent.deleteMany({
      where: { workspaceId: { in: createdIds.orders } },
    });
    await prisma.timelineEvent.deleteMany({ where: { workspaceId: { in: allIds } } });
    await prisma.shipmentWorkspace.deleteMany({ where: { workspaceId: { in: createdIds.shipments } } });
    await prisma.workspaceParticipant.deleteMany({ where: { workspaceId: { in: allIds } } });
    await prisma.workspace.deleteMany({ where: { id: { in: allIds } } });

    createdIds.orders.length = 0;
    createdIds.shipments.length = 0;
  });

  it("shadow mirror: confirm_booking recommends book_shipment without changing order", async () => {
    const { orderId, shipmentId } = await createPair("FREIGHT_REQUESTED", "SHIPMENT_CREATED");
    const orch = await loadOrchestrator();

    await orch.onShipmentTransition({
      shipmentId,
      action: "confirm_booking",
      eventId: `${shipmentId}:confirm_booking:test`,
    });

    const orderBefore = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderBefore.state).toBe("FREIGHT_REQUESTED");

    const recs = await orch.listRecommendations({ orderId });
    expect(recs).toHaveLength(1);
    expect(recs[0]!.mode).toBe("shadow");
    const plan = recs[0]!.plan as { suggestedActions: Array<{ entity: string; action: string }> };
    expect(plan.suggestedActions).toEqual([{ entity: "ORDER", action: "book_shipment", payload: {} }]);
  });

  it("desync catch-up: order IN_TRANSIT + shipment SHIPMENT_CREATED plans shipment steps", async () => {
    const { orderId, shipmentId } = await createPair("IN_TRANSIT", "SHIPMENT_CREATED");
    const orch = await loadOrchestrator();

    const plan = await orch.evaluatePair(orderId, shipmentId);
    expect(plan).not.toBeNull();
    expect(plan!.laggingEntity).toBe("SHIPMENT");
    expect(plan!.suggestedActions.some((s) => s.entity === "SHIPMENT")).toBe(true);
    expect(plan!.suggestedActions[0]!.action).toBe("confirm_booking");
  });

  it("idempotency: replay desync alert does not duplicate recommendations", async () => {
    const { orderId, shipmentId } = await createPair("IN_TRANSIT", "SHIPMENT_CREATED");
    const orch = await loadOrchestrator();

    const input = {
      orderId,
      shipmentId,
      orderState: "IN_TRANSIT",
      shipmentState: "SHIPMENT_CREATED",
      rule: "ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT",
      laggingEntity: "SHIPMENT" as const,
    };

    const first = await orch.planFromDesyncAlert(input);
    const second = await orch.planFromDesyncAlert(input);

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    const recs = await orch.listRecommendations({ orderId });
    expect(recs).toHaveLength(1);
  });

  it("depart chain: depart_vessel recommends mark_departed in shadow mode", async () => {
    const { orderId, shipmentId } = await createPair("SHIPMENT_BOOKED", "LOADED_ON_VESSEL");
    const orch = await loadOrchestrator();

    await orch.onShipmentTransition({
      shipmentId,
      action: "depart_vessel",
      eventId: `${shipmentId}:depart_vessel:test`,
    });

    const order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.state).toBe("SHIPMENT_BOOKED");

    const recs = await orch.listRecommendations({ orderId });
    const plan = recs[0]!.plan as { suggestedActions: Array<{ action: string }> };
    expect(plan.suggestedActions.some((s) => s.action === "mark_departed")).toBe(true);
  });

  it("exception suggest: report_exception recommends suggest_dispute only", async () => {
    const { orderId, shipmentId } = await createPair("IN_TRANSIT", "IN_TRANSIT");
    const orch = await loadOrchestrator();

    await orch.onShipmentTransition({
      shipmentId,
      action: "report_exception",
      payload: { category: "DELIVERY_DELAY" },
      eventId: `${shipmentId}:report_exception:test`,
    });

    const order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.state).toBe("IN_TRANSIT");

    const recs = await orch.listRecommendations({ orderId });
    const plan = recs[0]!.plan as { suggestedActions: Array<{ action: string; payload?: { category: string } }> };
    expect(plan.suggestedActions).toEqual([
      { entity: "ORDER", action: "suggest_dispute", payload: { category: "DELIVERY_DELAY" } },
    ]);
  });

  it("cancel_order plans cancel_shipment mirror in shadow mode", async () => {
    const { orderId, shipmentId } = await createPair("IN_TRANSIT", "IN_TRANSIT");
    const orch = await loadOrchestrator();

    await orch.onOrderTransition({
      orderId,
      action: "cancel_order",
      payload: { reason: "Buyer cancelled" },
      eventId: `${orderId}:cancel_order:test`,
      result: { fromState: "IN_TRANSIT", toState: "CANCELLED" },
    });

    const shipment = await prisma.workspace.findUniqueOrThrow({ where: { id: shipmentId } });
    expect(shipment.state).toBe("IN_TRANSIT");

    const recs = await orch.listRecommendations({ orderId });
    const plan = recs[0]!.plan as { suggestedActions: Array<{ entity: string; action: string }> };
    expect(plan.suggestedActions).toEqual([{ entity: "SHIPMENT", action: "cancel_shipment", payload: {} }]);
  });
});
