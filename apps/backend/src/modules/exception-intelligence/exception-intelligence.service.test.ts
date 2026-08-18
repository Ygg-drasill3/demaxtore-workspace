import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExceptionIntelligenceService } from "./exception-intelligence.service.js";

const ORDER_ID = "11111111-1111-1111-1111-111111111111";
const SHIPMENT_ID = "22222222-2222-2222-2222-222222222222";
const ISSUE_ID = "33333333-3333-3333-3333-333333333333";
const TASK_ID = "44444444-4444-4444-4444-444444444444";

function makePrisma() {
  const issueStore = new Map<string, Record<string, unknown>>();
  const taskStore = new Map<string, Record<string, unknown>>();

  return {
    shipmentWorkspace: {
      findUnique: vi.fn().mockResolvedValue({
        orderWorkspaceId: ORDER_ID,
        bookingStatus: "PENDING",
        bookingRequestedAt: new Date(Date.now() - 49 * 3_600_000),
        cargoReadyDate: null,
        siCutoff: null,
        cyCutoff: null,
      }),
    },
    purchaseOrder: {
      findFirst: vi.fn().mockResolvedValue({
        revisions: [
          {
            snapshotJson: {
              header: { expectedDeliveryDate: "2026-09-20T00:00:00.000Z" },
            },
          },
        ],
      }),
      findUnique: vi.fn().mockResolvedValue({ id: "po-1" }),
    },
    operationalIssue: {
      findFirst: vi.fn(async ({ where }: { where: { orderId: string; automationKey: string } }) => {
        const key = `${where.orderId}:${where.automationKey}`;
        return issueStore.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: ISSUE_ID, status: "OPEN", ...data };
        issueStore.set(`${data.orderId}:${data.automationKey}`, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const [k, v] of issueStore) {
          if ((v as { id: string }).id === where.id) {
            const next = { ...v, ...data };
            issueStore.set(k, next);
            return next;
          }
        }
        return { id: where.id, ...data };
      }),
    },
    operationalTask: {
      findFirst: vi.fn(async ({ where }: { where: { orderId: string; automationKey: string } }) => {
        const key = `${where.orderId}:${where.automationKey}`;
        return taskStore.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: TASK_ID, status: "OPEN", ...data };
        taskStore.set(`${data.orderId}:${data.automationKey}`, row);
        return row;
      }),
    },
    timelineEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    _issueStore: issueStore,
    _taskStore: taskStore,
  };
}

describe("ExceptionIntelligenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TEST 1–8 — ETA delivery risk creates issue with impact/severity/owner/action + task", async () => {
    const prisma = makePrisma();
    const svc = new ExceptionIntelligenceService(prisma as never);
    const r1 = await svc.onEtaChanged({
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 96,
      currentEta: new Date("2026-09-25T00:00:00.000Z"),
    });
    expect(r1.raised).toBe(true);
    expect(r1.created).toBe(true);
    expect(r1.issueId).toBe(ISSUE_ID);
    expect(r1.taskId).toBe(TASK_ID);
    expect(r1.outcome?.impactType).toBe("DELIVERY_RISK");
    expect(r1.outcome?.severity).toBe("CRITICAL");
    expect(r1.outcome?.ownerRole).toBe("OPERATIONS");
    expect(r1.outcome?.recommendedAction).toMatch(/delivery/i);
    expect(prisma.operationalIssue.create).toHaveBeenCalledTimes(1);
    expect(prisma.operationalTask.create).toHaveBeenCalledTimes(1);
  });

  it("TEST 10 — informational ETA does not create task/issue", async () => {
    const prisma = makePrisma();
    prisma.purchaseOrder.findFirst.mockResolvedValue({ revisions: [] });
    const svc = new ExceptionIntelligenceService(prisma as never);
    const r = await svc.onEtaChanged({
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 12,
      currentEta: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(r.raised).toBe(false);
    expect(r.taskId).toBeNull();
    expect(prisma.operationalIssue.create).not.toHaveBeenCalled();
    expect(prisma.operationalTask.create).not.toHaveBeenCalled();
  });

  it("TEST 11–12 — repeated ETA event does not duplicate issue/task", async () => {
    const prisma = makePrisma();
    const svc = new ExceptionIntelligenceService(prisma as never);
    const input = {
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 96,
      currentEta: new Date("2026-09-25T00:00:00.000Z"),
    };
    const r1 = await svc.onEtaChanged(input);
    const r2 = await svc.onEtaChanged(input);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r2.issueId).toBe(r1.issueId);
    expect(prisma.operationalIssue.create).toHaveBeenCalledTimes(1);
    expect(prisma.operationalTask.create).toHaveBeenCalledTimes(1);
  });

  it("TEST 14 — small ETA after risk can auto-resolve prior issue", async () => {
    const prisma = makePrisma();
    const svc = new ExceptionIntelligenceService(prisma as never);
    await svc.onEtaChanged({
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 96,
      currentEta: new Date("2026-09-25T00:00:00.000Z"),
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue({ revisions: [] });
    const r = await svc.onEtaChanged({
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 6,
      currentEta: new Date("2026-09-21T00:00:00.000Z"),
    });
    expect(r.raised).toBe(false);
    expect(prisma.operationalIssue.update).toHaveBeenCalled();
    const updated = [...prisma._issueStore.values()][0] as { status: string };
    expect(updated.status).toBe("RESOLVED");
  });

  it("safeEvaluate never throws to caller", async () => {
    const prisma = makePrisma();
    prisma.shipmentWorkspace.findUnique.mockRejectedValue(new Error("db down"));
    const svc = new ExceptionIntelligenceService(prisma as never);
    const r = await svc.onEtaChanged({
      shipmentWorkspaceId: SHIPMENT_ID,
      etaShiftHours: 48,
      currentEta: new Date(),
    });
    expect(r.raised).toBe(false);
    expect(r.outcome).toBeNull();
  });
});
