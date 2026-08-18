import { describe, expect, it, vi, beforeEach } from "vitest";
import { canTransitionInland, INLAND_CUSTOMS_GATED_STATUSES } from "@dmx/contracts/inland-delivery";
import { createInlandDeliveryService } from "./inland-delivery.service.js";

const buyer = { id: "buyer-1", email: "buyer@test.com", role: "BUYER" as const };
const trucker = { id: "trucker-1", email: "trucker@test.com", role: "TRUCKER" as const };
const ops = { id: "ops-1", email: "ops@test.com", role: "OPS_MANAGER" as const };

function baseInland(overrides: Record<string, unknown> = {}) {
  return {
    id: "inland-1",
    organisationId: "org-1",
    shipmentWorkspaceId: "ship-1",
    orderWorkspaceId: "order-1",
    customsCaseId: "case-1",
    status: "REQUESTED",
    statusSource: "BUYER",
    deliveryName: "Acme WH",
    deliveryAddress: "Gebze OSB",
    deliveryCity: "Gebze",
    deliveryPostalCode: null,
    deliveryContactName: null,
    deliveryContactPhone: null,
    pickupLocation: "Terminal TRIST",
    pickupAt: null,
    pickupWindow: null,
    appointmentRef: null,
    instructions: null,
    truckerUserId: null,
    truckerAssignmentId: null,
    driverName: null,
    driverPhone: null,
    vehiclePlate: null,
    releaseReference: null,
    pickedUpAt: null,
    gateOutAt: null,
    inTransitAt: null,
    deliveredAt: null,
    podStatus: "PENDING",
    podTradeDocumentId: null,
    inlandCostAmount: null,
    inlandCostCurrency: null,
    inlandCostKind: null,
    inlandCostSource: null,
    cancelledAt: null,
    cancelReason: null,
    createdById: "buyer-1",
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockDb(row = baseInland()) {
  const state = { row };
  return {
    state,
    customsCase: {
      findUnique: vi.fn().mockResolvedValue({ id: "case-1", status: "CLEARED" }),
    },
    shipmentWorkspace: {
      findUnique: vi.fn().mockResolvedValue({
        workspaceId: "ship-1",
        orderWorkspaceId: "order-1",
        buyerUserId: "buyer-1",
        referenceNumber: "SHP-1",
        orderRef: "ORD-1",
        destinationPort: "TRIST",
        containerNumber: "MSCU123",
        customsCompletedAt: new Date(),
      }),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ organisationId: "org-1" }) },
    inlandDelivery: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(state.row)),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }: any) => {
        state.row = { ...baseInland(), ...data, id: "inland-1", createdAt: new Date(), updatedAt: new Date() };
        return Promise.resolve(state.row);
      }),
      update: vi.fn().mockImplementation(({ data }: any) => {
        state.row = { ...state.row, ...data, updatedAt: new Date() };
        return Promise.resolve(state.row);
      }),
    },
    inlandDeliveryEvent: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    partnerAssignment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    workspaceParticipant: { findFirst: vi.fn().mockResolvedValue({ id: "p1" }) },
    operationalIssue: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "issue-1" }),
      update: vi.fn(),
    },
    operationalTask: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "task-1" }),
      update: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn().mockResolvedValue({ id: "tl-1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    deliveryRecord: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "dr-1" }),
    },
    tradeDocument: { findUnique: vi.fn() },
    purchaseOrder: { findUnique: vi.fn().mockResolvedValue({ id: "po-1" }) },
  };
}

describe("inland contracts", () => {
  it("gates physical release statuses behind customs", () => {
    expect(INLAND_CUSTOMS_GATED_STATUSES).toContain("PICKED_UP");
    expect(INLAND_CUSTOMS_GATED_STATUSES).toContain("DELIVERED");
    expect(canTransitionInland("READY_FOR_PICKUP", "PICKED_UP")).toBe(true);
    expect(canTransitionInland("REQUESTED", "PICKED_UP")).toBe(false);
  });
});

describe("createInlandDeliveryService", () => {
  let db: ReturnType<typeof mockDb>;
  let svc: ReturnType<typeof createInlandDeliveryService>;

  beforeEach(() => {
    db = mockDb();
    svc = createInlandDeliveryService(db as any);
  });

  it("requests inland delivery idempotently", async () => {
    db.inlandDelivery.findUnique.mockResolvedValueOnce(null);
    const first = await svc.request(buyer, {
      shipmentWorkspaceId: "ship-1",
      deliveryAddress: "Gebze Warehouse 1",
      deliveryCity: "Gebze",
    });
    expect(first.status).toBe("REQUESTED");
    expect(db.inlandDelivery.create).toHaveBeenCalled();

    const second = await svc.request(buyer, {
      shipmentWorkspaceId: "ship-1",
      deliveryAddress: "Gebze Warehouse 1",
    });
    expect(second.id).toBe(first.id);
    expect(db.inlandDelivery.create).toHaveBeenCalledTimes(1);
  });

  it("rejects pickup when customs not cleared", async () => {
    db.customsCase.findUnique.mockResolvedValue({ id: "case-1", status: "CUSTOMS_PROCESSING" });
    db.shipmentWorkspace.findUnique.mockResolvedValue({
      workspaceId: "ship-1",
      customsCompletedAt: null,
      referenceNumber: "SHP-1",
      orderRef: "ORD-1",
      destinationPort: "TRIST",
      containerNumber: null,
    });
    db.state.row = baseInland({ status: "READY_FOR_PICKUP", truckerUserId: "trucker-1" });
    db.partnerAssignment.findFirst.mockResolvedValue({ id: "a1", userId: "trucker-1" });

    await expect(svc.confirmPickup(trucker, "inland-1")).rejects.toMatchObject({
      status: 409,
      code: "CUSTOMS_NOT_CLEARED",
    });
  });

  it("allows assigned trucker to confirm pickup when cleared", async () => {
    db.state.row = baseInland({ status: "READY_FOR_PICKUP", truckerUserId: "trucker-1" });
    db.partnerAssignment.findFirst.mockResolvedValue({ id: "a1", userId: "trucker-1" });
    const updated = await svc.confirmPickup(trucker, "inland-1");
    expect(updated.status).toBe("PICKED_UP");
    expect(db.inlandDeliveryEvent.create).toHaveBeenCalled();
  });

  it("denies unassigned trucker", async () => {
    db.state.row = baseInland({ status: "READY_FOR_PICKUP", truckerUserId: "other" });
    db.partnerAssignment.findFirst.mockResolvedValue(null);
    await expect(svc.get(trucker, "inland-1")).rejects.toMatchObject({
      status: 403,
      code: "PARTNER_NOT_ASSIGNED",
    });
  });

  it("marks delivered with provenance and delivery record", async () => {
    db.state.row = baseInland({
      status: "IN_TRANSIT",
      truckerUserId: "trucker-1",
      truckerAssignmentId: "a1",
    });
    db.partnerAssignment.findFirst.mockResolvedValue({ id: "a1", userId: "trucker-1" });
    const updated = await svc.markDelivered(trucker, "inland-1", { note: "Left at dock" });
    expect(updated.status).toBe("DELIVERED");
    expect(updated.deliveredAt).toBeTruthy();
    expect(db.deliveryRecord.create).toHaveBeenCalled();
    expect(db.shipmentWorkspace.update).toHaveBeenCalled();
  });

  it("hides inland cost from trucker", async () => {
    db.state.row = baseInland({
      status: "IN_TRANSIT",
      truckerUserId: "trucker-1",
      inlandCostAmount: 1500,
      inlandCostCurrency: "TRY",
      inlandCostKind: "ESTIMATED",
    });
    db.partnerAssignment.findFirst.mockResolvedValue({ id: "a1", userId: "trucker-1" });
    const dto = await svc.get(trucker, "inland-1");
    expect(dto.inlandCostAmount).toBeNull();
  });

  it("assigned trucker can schedule pickup and sees SCHEDULE_PICKUP action", async () => {
    db.state.row = baseInland({ status: "TRUCKER_ASSIGNED", truckerUserId: "trucker-1" });
    db.partnerAssignment.findFirst.mockResolvedValue({ id: "a1", userId: "trucker-1" });
    const dto = await svc.get(trucker, "inland-1");
    expect(dto.allowedActions).toContain("SCHEDULE_PICKUP");
    const scheduled = await svc.schedulePickup(trucker, "inland-1", {
      pickupAt: new Date("2026-08-20T08:00:00.000Z").toISOString(),
    });
    expect(scheduled.status).toBe("PICKUP_SCHEDULED");
  });

  it("unassigned trucker cannot get inland delivery", async () => {
    db.state.row = baseInland({ status: "TRUCKER_ASSIGNED", truckerUserId: "other-trucker" });
    db.partnerAssignment.findFirst.mockResolvedValue(null);
    await expect(svc.get(trucker, "inland-1")).rejects.toMatchObject({ status: 403 });
  });

  it("ops can record cost", async () => {
    db.state.row = baseInland({ status: "TRUCKER_ASSIGNED", truckerUserId: "trucker-1" });
    const dto = await svc.recordCost(ops, "inland-1", {
      amount: 2200,
      currency: "TRY",
      kind: "ESTIMATED",
      source: "MANUAL",
    });
    expect(dto.inlandCostAmount).toBe(2200);
  });

  it("cleared does not equal delivered", async () => {
    db.inlandDelivery.findUnique.mockResolvedValueOnce(null);
    const row = await svc.request(buyer, {
      shipmentWorkspaceId: "ship-1",
      deliveryAddress: "Addr",
    });
    expect(row.status).not.toBe("DELIVERED");
    expect(row.customsCleared).toBe(true);
  });
});
