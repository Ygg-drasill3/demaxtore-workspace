import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../db/prisma.js";
import { ShipmentService } from "./shipment.service.js";

// C2 regression: resolve_exception must resume ONLY to the server-recorded
// stateBefore. A client-supplied payload.resumeState must be ignored, otherwise
// a user could jump the shipment straight to DELIVERED/COMPLETED and bypass
// every intermediate FSM gate.

const service = new ShipmentService(prisma);
const created: string[] = [];

async function makeExceptionShipment(stateBefore: string): Promise<{ workspaceId: string; ownerId: string; ownerEmail: string }> {
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "buyer1@acme.test" } });
  const ws = await prisma.workspace.create({
    data: {
      externalRef: `SHP-C2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "SHIPMENT",
      state: "EXCEPTION",
      currency: "USD",
      createdById: owner.id,
      participants: { create: [{ userId: owner.id, participantRole: "OWNER" }] },
      shipmentExceptions: {
        create: [{
          category: "CUSTOMS_HOLD",
          reason: "held at customs",
          stateBefore,
          status: "OPEN",
          reportedById: owner.id,
        }],
      },
    },
  });
  created.push(ws.id);
  return { workspaceId: ws.id, ownerId: owner.id, ownerEmail: owner.email };
}

describe("shipment resolve_exception resume-state hardening (C2)", () => {
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { workspaceId: { in: created } } });
    await prisma.timelineEvent.deleteMany({ where: { workspaceId: { in: created } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: created } } });
    await prisma.shipmentException.deleteMany({ where: { workspaceId: { in: created } } });
    await prisma.workspaceParticipant.deleteMany({ where: { workspaceId: { in: created } } });
    await prisma.workspace.deleteMany({ where: { id: { in: created } } });
  });

  it("ignores a malicious resumeState=DELIVERED and resumes to recorded stateBefore (IN_TRANSIT)", async () => {
    const { workspaceId, ownerId, ownerEmail } = await makeExceptionShipment("IN_TRANSIT");

    const res = await service.applyTransition({
      workspaceId,
      action: "resolve_exception",
      actor: { id: ownerId, email: ownerEmail, role: "ADMIN" },
      reason: "cleared",
      payload: { resolution: "cleared", resumeState: "DELIVERED" },
    });

    expect(res.toState).toBe("IN_TRANSIT");
    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    expect(ws.state).toBe("IN_TRANSIT"); // NOT "DELIVERED"
  });

  it("ignores a malicious resumeState=COMPLETED (terminal) too", async () => {
    const { workspaceId, ownerId, ownerEmail } = await makeExceptionShipment("CUSTOMS_CLEARANCE");

    const res = await service.applyTransition({
      workspaceId,
      action: "resolve_exception",
      actor: { id: ownerId, email: ownerEmail, role: "ADMIN" },
      reason: "cleared",
      payload: { resolution: "cleared", resumeState: "COMPLETED" },
    });

    expect(res.toState).toBe("CUSTOMS_CLEARANCE");
    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    expect(ws.state).toBe("CUSTOMS_CLEARANCE");
  });
});
