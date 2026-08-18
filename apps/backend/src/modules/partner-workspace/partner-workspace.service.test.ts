import { describe, it, expect, vi, beforeEach } from "vitest";
import { PartnerWorkspaceService } from "./partner-workspace.service.js";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    partnerAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workspaceParticipant: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    operationalTask: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
    },
    operationalIssue: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    shipmentWorkspace: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    purchaseOrder: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tradeDocument: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    inlandDelivery: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    inlandDeliveryEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    customsCase: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    shipmentTrackingSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    timelineEvent: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

const agent = { id: "agent-1", role: "ORIGIN_AGENT", email: "agent@test.com" };
const supplier = { id: "sup-1", role: "SUPPLIER", email: "sup@test.com" };
const admin = { id: "admin-1", role: "ADMIN", email: "admin@test.com" };

describe("PartnerWorkspaceService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TEST 3 — partner cannot access unassigned transaction", async () => {
    const prisma = makePrisma();
    prisma.workspace.findUnique.mockResolvedValue({ id: "shp-1", type: "SHIPMENT" });
    prisma.partnerAssignment.findMany.mockResolvedValue([]);
    const svc = new PartnerWorkspaceService(prisma as never);
    await expect(svc.getTransaction(agent, "shp-1")).rejects.toMatchObject({ status: 403 });
  });

  it("TEST 21 — assigned origin agent can see shipment", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findUnique.mockResolvedValue({ id: "shp-1", type: "SHIPMENT" });
    prisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "shp-1",
      type: "SHIPMENT",
      externalRef: "SHP-1",
      state: "BOOKING_CONFIRMED",
    });
    prisma.shipmentWorkspace.findUnique.mockResolvedValue({
      orderWorkspaceId: "ord-1",
      bookingStatus: "CONFIRMED",
      bookingRef: "BK-1",
      carrierBookingNumber: null,
      carrierName: "MSC",
      vesselName: "V1",
      voyageNumber: "001",
      etd: null,
      eta: null,
      originPort: "TRIST",
      destinationPort: "NLRTM",
      siCutoff: new Date("2026-09-01"),
      cyCutoff: null,
      cargoReadyDate: null,
      containerNumber: "MSCU123",
    });
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.tradeDocument.findMany.mockResolvedValue([]);
    prisma.operationalIssue.findMany.mockResolvedValue([]);
    const svc = new PartnerWorkspaceService(prisma as never);
    const detail = await svc.getTransaction(agent, "shp-1");
    expect(detail.partnerRole).toBe("ORIGIN_AGENT");
    expect(detail.summary.bookingReference).toBe("BK-1");
    expect(detail.allowedActions).toContain("confirm-gate-in");
    expect(detail.summary).not.toHaveProperty("margin");
  });

  it("TEST 24 — origin agent cannot confirm cargo ready", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "ord-1" }]);
    prisma.workspace.findUnique.mockResolvedValue({ id: "ord-1", type: "ORDER" });
    const svc = new PartnerWorkspaceService(prisma as never);
    await expect(svc.confirmCargoReady(agent, "ord-1")).rejects.toMatchObject({ status: 403 });
  });

  it("TEST 14 — gate-in confirm is idempotent", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findUnique
      .mockResolvedValueOnce({ id: "shp-1", type: "SHIPMENT" })
      .mockResolvedValueOnce({
        metadata: { gateInConfirmedAt: "2026-08-01T00:00:00.000Z" },
      });
    prisma.shipmentWorkspace.findUnique.mockResolvedValue({
      workspaceId: "shp-1",
      orderWorkspaceId: "ord-1",
      pickedUpAt: new Date(),
    });
    const svc = new PartnerWorkspaceService(prisma as never);
    const r = await svc.confirmGateIn(agent, "shp-1");
    expect(r.idempotent).toBe(true);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("TEST 26 — customs broker role can be assigned", async () => {
    const prisma = makePrisma();
    prisma.workspace.findUnique.mockResolvedValue({ id: "shp-1", type: "SHIPMENT" });
    prisma.user.findUnique.mockResolvedValue({
      id: "broker-1",
      role: "CUSTOMS_BROKER",
      organisationId: null,
    });
    prisma.partnerAssignment.findUnique.mockResolvedValue(null);
    prisma.partnerAssignment.create.mockResolvedValue({ id: "asg-1" });
    const svc = new PartnerWorkspaceService(prisma as never);
    const r = await svc.assignPartner(admin, {
      workspaceId: "shp-1",
      userId: "broker-1",
      partnerRole: "CUSTOMS_BROKER",
    });
    expect(r.created).toBe(true);
    expect(prisma.partnerAssignment.create).toHaveBeenCalled();
  });

  it("TEST 15 — supplier sees assigned PO via COUNTERPARTY", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([]);
    prisma.workspaceParticipant.findMany.mockResolvedValue([{ workspaceId: "ord-1" }]);
    prisma.workspace.findUnique.mockResolvedValue({ id: "ord-1", type: "ORDER" });
    prisma.workspace.findUniqueOrThrow.mockResolvedValue({
      id: "ord-1",
      type: "ORDER",
      externalRef: "ORD-1",
      state: "PO_ISSUED",
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      poNumber: "PO-1",
      status: "ISSUED",
      currency: "USD",
      lines: [{ id: "l1", sku: "A", description: "Item", quantity: 10 }],
    });
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.tradeDocument.findMany.mockResolvedValue([]);
    prisma.operationalIssue.findMany.mockResolvedValue([]);
    const svc = new PartnerWorkspaceService(prisma as never);
    const detail = await svc.getTransaction(supplier, "ord-1");
    expect(detail.summary.po).toMatchObject({ poNumber: "PO-1" });
    expect((detail.summary.po as { lines: unknown[] }).lines).toHaveLength(1);
  });

  it("CUSTOMS_BROKER home returns assigned customs cases with navigation ids and no margin", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findMany.mockResolvedValue([
      { id: "shp-1", type: "SHIPMENT", externalRef: "SHP-UI17B-1", state: "IN_TRANSIT" },
    ]);
    prisma.shipmentWorkspace.findMany.mockResolvedValue([{ orderWorkspaceId: "ord-1" }]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    prisma.customsCase.findMany.mockResolvedValue([
      {
        id: "case-assigned",
        shipmentWorkspaceId: "shp-1",
        orderWorkspaceId: "ord-1",
        status: "DRAFT",
        readinessStatus: "NOT_READY",
        declarationReference: null,
        shipmentWorkspace: {
          referenceNumber: "SHP-UI17B-1",
          orderRef: "ORD-1",
          poRef: "PO-UI17B",
          eta: null,
          buyerUserId: "buyer-1",
          destinationPort: "TRIST",
        },
      },
    ]);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home({ id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" });
    expect(home.customsCases).toHaveLength(1);
    expect(home.customsCases?.[0]).toMatchObject({
      customsCaseId: "case-assigned",
      shipmentRef: "SHP-UI17B-1",
      importerLabel: "PO-UI17B",
      customsStatus: "DRAFT",
    });
    expect(JSON.stringify(home)).not.toMatch(/margin/i);
  });

  it("CUSTOMS_BROKER home is empty when no assignment (does not fabricate cases)", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([]);
    prisma.workspace.findMany.mockResolvedValue([]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home({ id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" });
    expect(home.customsCases).toEqual([]);
    expect(prisma.customsCase.findMany).not.toHaveBeenCalled();
  });

  it("ORIGIN_AGENT home does not include customsCases queue", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findMany.mockResolvedValue([
      { id: "shp-1", type: "SHIPMENT", externalRef: "SHP-1", state: "IN_TRANSIT" },
    ]);
    prisma.shipmentWorkspace.findMany.mockResolvedValue([{ orderWorkspaceId: "ord-1" }]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home(agent);
    expect(home.customsCases).toBeUndefined();
    expect(prisma.customsCase.findMany).not.toHaveBeenCalled();
  });

  it("revoke CUSTOMS_BROKER assignment clears denormalized case broker pointer", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findUnique.mockResolvedValue({
      id: "asg-1",
      workspaceId: "shp-1",
      userId: "broker-1",
      partnerRole: "CUSTOMS_BROKER",
      revokedAt: null,
    });
    prisma.partnerAssignment.update.mockResolvedValue({ id: "asg-1", revokedAt: new Date() });
    const svc = new PartnerWorkspaceService(prisma as never);
    const r = await svc.revokeAssignment(admin, "asg-1");
    expect(r.revoked).toBe(true);
    expect(prisma.customsCase.updateMany).toHaveBeenCalled();
  });

  it("TRUCKER home returns assignment-scoped inlandDeliveries with navigation ids", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findMany.mockResolvedValue([
      { id: "shp-1", type: "SHIPMENT", externalRef: "SHP-UI17C-1", state: "BOOKING_CONFIRMED" },
    ]);
    prisma.shipmentWorkspace.findMany.mockResolvedValue([{ orderWorkspaceId: "ord-1" }]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    prisma.inlandDelivery.findMany.mockResolvedValue([
      {
        id: "inland-assigned",
        shipmentWorkspaceId: "shp-1",
        status: "TRUCKER_ASSIGNED",
        pickupLocation: "TRIST",
        deliveryCity: "Istanbul",
        pickupAt: null,
        podStatus: "PENDING",
        truckerUserId: "trucker-1",
        shipmentWorkspace: {
          referenceNumber: "SHP-UI17C-1",
          orderRef: "ORD-1",
          containerNumber: "MSKU17C",
        },
      },
    ]);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home({ id: "trucker-1", role: "TRUCKER", email: "t@x.com" });
    expect(home.inlandDeliveries).toHaveLength(1);
    expect(home.inlandDeliveries?.[0]).toMatchObject({
      inlandDeliveryId: "inland-assigned",
      shipmentRef: "SHP-UI17C-1",
      containerNumber: "MSKU17C",
      deliveryCity: "Istanbul",
      status: "TRUCKER_ASSIGNED",
      nextAction: "Schedule pickup",
    });
    expect(home.customsCases).toBeUndefined();
    expect(JSON.stringify(home)).not.toMatch(/margin/i);
    expect(JSON.stringify(home)).not.toMatch(/buyRate/i);
  });

  it("TRUCKER home is empty when no assignment (does not fabricate deliveries)", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([]);
    prisma.workspace.findMany.mockResolvedValue([]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home({ id: "trucker-1", role: "TRUCKER", email: "t@x.com" });
    expect(home.inlandDeliveries).toEqual([]);
    expect(prisma.inlandDelivery.findMany).not.toHaveBeenCalled();
  });

  it("ORIGIN_AGENT home does not include inlandDeliveries queue", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findMany.mockResolvedValue([{ workspaceId: "shp-1" }]);
    prisma.workspace.findMany.mockResolvedValue([
      { id: "shp-1", type: "SHIPMENT", externalRef: "SHP-1", state: "IN_TRANSIT" },
    ]);
    prisma.shipmentWorkspace.findMany.mockResolvedValue([{ orderWorkspaceId: "ord-1" }]);
    prisma.operationalTask.findMany.mockResolvedValue([]);
    prisma.operationalIssue.count.mockResolvedValue(0);
    const svc = new PartnerWorkspaceService(prisma as never);
    const home = await svc.home(agent);
    expect(home.inlandDeliveries).toBeUndefined();
    expect(prisma.inlandDelivery.findMany).not.toHaveBeenCalled();
  });

  it("revoke TRUCKER assignment clears denormalized inland trucker pointer", async () => {
    const prisma = makePrisma();
    prisma.partnerAssignment.findUnique.mockResolvedValue({
      id: "asg-t1",
      workspaceId: "shp-1",
      userId: "trucker-1",
      partnerRole: "TRUCKER",
      revokedAt: null,
    });
    prisma.partnerAssignment.update.mockResolvedValue({ id: "asg-t1", revokedAt: new Date() });
    prisma.inlandDelivery.findFirst.mockResolvedValue({
      id: "inland-1",
      status: "TRUCKER_ASSIGNED",
    });
    const svc = new PartnerWorkspaceService(prisma as never);
    const r = await svc.revokeAssignment(admin, "asg-t1");
    expect(r.revoked).toBe(true);
    expect(prisma.inlandDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inland-1" },
        data: expect.objectContaining({ truckerUserId: null, truckerAssignmentId: null, status: "REQUESTED" }),
      }),
    );
  });
});
