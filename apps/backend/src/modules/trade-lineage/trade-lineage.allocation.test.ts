import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeLineageService } from "./trade-lineage.service.js";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    purchaseOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    purchaseOrderLine: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    shipmentWorkspace: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    shipmentContainer: {
      findFirst: vi.fn(),
    },
    shipmentLineAllocation: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    tradeShipmentLink: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    workspace: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    orderWorkspace: { findUnique: vi.fn() },
    inspectionWorkspace: { findMany: vi.fn().mockResolvedValue([]) },
    freightRequest: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceParticipant: { findFirst: vi.fn() },
    ...overrides,
  };
}

const admin = { id: "admin-1", role: "ADMIN", email: "admin@test.com" } as const;
const SHIP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PO = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const LINE = "dddddddd-dddd-dddd-dddd-dddddddddddd";

describe("TradeLineageService allocations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects buyer mutation of line allocations", async () => {
    const prisma = makePrisma();
    const svc = new TradeLineageService(prisma as never);
    await expect(
      svc.upsertAllocation(
        { id: "buyer-1", role: "BUYER", email: "buyer@test.com" } as never,
        { purchaseOrderLineId: LINE, shipmentWorkspaceId: SHIP, quantity: 10 },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.shipmentLineAllocation.create).not.toHaveBeenCalled();
  });

  it("upserts remaining qty for ops and rejects over-allocation", async () => {
    const prisma = makePrisma();
    prisma.workspaceParticipant = { findFirst: vi.fn() };
    prisma.purchaseOrderLine.findUnique.mockResolvedValue({
      id: LINE,
      purchaseOrderId: PO,
      quantity: 100,
    });
    prisma.shipmentWorkspace.findUnique.mockResolvedValue({ id: "sw-db", workspaceId: SHIP });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([]);
    prisma.purchaseOrder.findUnique.mockResolvedValue({ orderId: ORDER });
    prisma.shipmentLineAllocation.create.mockResolvedValue({ id: "alloc-ui" });

    const svc = new TradeLineageService(prisma as never);
    const ok = await svc.upsertAllocation(admin as never, {
      purchaseOrderLineId: LINE,
      shipmentWorkspaceId: SHIP,
      quantity: 40,
    });
    expect(ok).toEqual({ id: "alloc-ui" });

    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      { id: "alloc-ui", quantity: 40, shipmentWorkspaceId: SHIP, shipmentContainerId: null },
    ]);
    await expect(
      svc.upsertAllocation(admin as never, {
        purchaseOrderLineId: LINE,
        shipmentWorkspaceId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        quantity: 70,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("attaches a container to the existing uncontainered allocation on the same shipment", async () => {
    const prisma = makePrisma();
    const CONTAINER = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    prisma.purchaseOrderLine.findUnique.mockResolvedValue({
      id: LINE,
      purchaseOrderId: PO,
      quantity: 100,
    });
    prisma.shipmentWorkspace.findUnique.mockResolvedValue({ id: "sw-db", workspaceId: SHIP });
    prisma.shipmentContainer.findFirst.mockResolvedValue({ id: CONTAINER });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      { id: "alloc-spawn", quantity: 100, shipmentWorkspaceId: SHIP, shipmentContainerId: null },
    ]);
    prisma.purchaseOrder.findUnique.mockResolvedValue({ orderId: ORDER });
    prisma.shipmentLineAllocation.update.mockResolvedValue({ id: "alloc-spawn" });

    const svc = new TradeLineageService(prisma as never);
    const ok = await svc.upsertAllocation(admin as never, {
      purchaseOrderLineId: LINE,
      shipmentWorkspaceId: SHIP,
      shipmentContainerId: CONTAINER,
      quantity: 100,
    });

    expect(ok).toEqual({ id: "alloc-spawn" });
    expect(prisma.shipmentLineAllocation.create).not.toHaveBeenCalled();
    expect(prisma.shipmentLineAllocation.update).toHaveBeenCalledWith({
      where: { id: "alloc-spawn" },
      data: expect.objectContaining({
        quantity: 100,
        shipmentContainerId: CONTAINER,
      }),
    });
  });

  it("allocates full remaining qty for a single PO line on spawn", async () => {
    const prisma = makePrisma();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: PO,
      orderId: ORDER,
      lines: [{ id: LINE, quantity: 500 }],
    });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([]);
    prisma.shipmentLineAllocation.create.mockResolvedValue({ id: "alloc-1" });

    const svc = new TradeLineageService(prisma as never);
    const result = await svc.allocateRemainingLinesForShipment(prisma as never, {
      orderWorkspaceId: ORDER,
      shipmentWorkspaceId: SHIP,
      actorUserId: admin.id,
      linkSource: "SPAWN",
    });

    expect(result.created).toBe(1);
    expect(result.allocated).toEqual([{ lineId: LINE, quantity: 500 }]);
    expect(prisma.shipmentLineAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        purchaseOrderLineId: LINE,
        purchaseOrderId: PO,
        shipmentWorkspaceId: SHIP,
        quantity: 500,
        createdById: admin.id,
      }),
    });
    expect(prisma.tradeShipmentLink.upsert).toHaveBeenCalled();
  });

  it("does not double-allocate on duplicate invocation", async () => {
    const prisma = makePrisma();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: PO,
      orderId: ORDER,
      lines: [{ id: LINE, quantity: 500 }],
    });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      {
        id: "alloc-1",
        quantity: 500,
        shipmentWorkspaceId: SHIP,
        shipmentContainerId: null,
      },
    ]);

    const svc = new TradeLineageService(prisma as never);
    const result = await svc.allocateRemainingLinesForShipment(prisma as never, {
      orderWorkspaceId: ORDER,
      shipmentWorkspaceId: SHIP,
      actorUserId: admin.id,
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prisma.shipmentLineAllocation.create).not.toHaveBeenCalled();
  });

  it("respects existing allocations on other active shipments (partial)", async () => {
    const otherShip = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    const prisma = makePrisma();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: PO,
      orderId: ORDER,
      lines: [{ id: LINE, quantity: 500 }],
    });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      {
        id: "alloc-other",
        quantity: 200,
        shipmentWorkspaceId: otherShip,
        shipmentContainerId: null,
      },
    ]);
    prisma.workspace.findMany.mockResolvedValue([{ id: otherShip, state: "IN_TRANSIT" }]);
    prisma.shipmentLineAllocation.create.mockResolvedValue({ id: "alloc-2" });

    const svc = new TradeLineageService(prisma as never);
    const result = await svc.allocateRemainingLinesForShipment(prisma as never, {
      orderWorkspaceId: ORDER,
      shipmentWorkspaceId: SHIP,
      actorUserId: admin.id,
    });

    expect(result.allocated).toEqual([{ lineId: LINE, quantity: 300 }]);
    expect(prisma.shipmentLineAllocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: 300 }),
    });
  });

  it("ignores cancelled shipment allocations when computing remaining", async () => {
    const cancelledShip = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const prisma = makePrisma();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: PO,
      orderId: ORDER,
      lines: [{ id: LINE, quantity: 500 }],
    });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      {
        id: "alloc-cancelled",
        quantity: 500,
        shipmentWorkspaceId: cancelledShip,
        shipmentContainerId: null,
      },
    ]);
    prisma.workspace.findMany.mockResolvedValue([{ id: cancelledShip, state: "CANCELLED" }]);
    prisma.shipmentLineAllocation.create.mockResolvedValue({ id: "alloc-3" });

    const svc = new TradeLineageService(prisma as never);
    const result = await svc.allocateRemainingLinesForShipment(prisma as never, {
      orderWorkspaceId: ORDER,
      shipmentWorkspaceId: SHIP,
      actorUserId: admin.id,
    });

    expect(result.allocated).toEqual([{ lineId: LINE, quantity: 500 }]);
  });

  it("skips when no remaining quantity is available", async () => {
    const otherShip = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    const prisma = makePrisma();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: PO,
      orderId: ORDER,
      lines: [{ id: LINE, quantity: 500 }],
    });
    prisma.shipmentLineAllocation.findMany.mockResolvedValue([
      {
        id: "alloc-other",
        quantity: 500,
        shipmentWorkspaceId: otherShip,
        shipmentContainerId: null,
      },
    ]);
    prisma.workspace.findMany.mockResolvedValue([{ id: otherShip, state: "IN_TRANSIT" }]);

    const svc = new TradeLineageService(prisma as never);
    const result = await svc.allocateRemainingLinesForShipment(prisma as never, {
      orderWorkspaceId: ORDER,
      shipmentWorkspaceId: SHIP,
      actorUserId: admin.id,
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prisma.shipmentLineAllocation.create).not.toHaveBeenCalled();
  });
});
