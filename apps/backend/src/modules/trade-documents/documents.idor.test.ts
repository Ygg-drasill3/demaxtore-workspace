import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { documentsController } from "./documents.controller.js";
import { AppError } from "../../utils/httpErrors.js";

// C7 regression: GET /api/trade-documents/:workspaceType/:workspaceId (summary)
// must enforce canAccessTradeWorkspace. A non-participant of another tenant
// must receive 403 and NO document data; the owner must still receive 200.

type Actor = { id: string; email: string; role: "BUYER" | "SUPPLIER" | "ADMIN" };

const created = { workspaces: [] as string[] };

async function callSummary(actor: Actor, workspaceType: "ORDER" | "SHIPMENT", workspaceId: string) {
  let body: { workspaceId?: string; documents?: unknown[] } | undefined;
  const req = { params: { workspaceType, workspaceId }, user: actor } as unknown as Request;
  const res = {
    json: (b: unknown) => {
      body = b as typeof body;
      return res;
    },
  } as unknown as Response;
  try {
    await documentsController.summary(req, res);
    return { status: 200, body };
  } catch (e) {
    if (e instanceof AppError) return { status: e.status, body: undefined };
    throw e;
  }
}

describe("trade-documents summary — cross-tenant access (C7 regression)", () => {
  let buyer1: Actor; // acme tenant — owner
  let buyer2: Actor; // beta tenant — non-participant
  let orderId: string;
  let shipmentId: string;

  beforeAll(async () => {
    const u1 = await prisma.user.findUniqueOrThrow({ where: { email: "buyer1@acme.test" } });
    const u2 = await prisma.user.findUniqueOrThrow({ where: { email: "buyer2@beta.test" } });
    buyer1 = { id: u1.id, email: u1.email, role: "BUYER" };
    buyer2 = { id: u2.id, email: u2.email, role: "BUYER" };

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const order = await prisma.workspace.create({
      data: {
        externalRef: `ORD-C7-${suffix}`,
        type: "ORDER",
        state: "ORDER_CREATED",
        currency: "USD",
        createdById: buyer1.id,
        participants: { create: [{ userId: buyer1.id, participantRole: "OWNER" }] },
      },
    });
    orderId = order.id;
    created.workspaces.push(order.id);

    const shipment = await prisma.workspace.create({
      data: {
        externalRef: `SHP-C7-${suffix}`,
        type: "SHIPMENT",
        state: "SHIPMENT_CREATED",
        currency: "USD",
        createdById: buyer1.id,
        participants: { create: [{ userId: buyer1.id, participantRole: "OWNER" }] },
      },
    });
    shipmentId = shipment.id;
    created.workspaces.push(shipment.id);

    await prisma.tradeDocument.createMany({
      data: [
        { workspaceType: "ORDER", workspaceId: orderId, documentType: "COMMERCIAL_INVOICE", status: "MISSING", ownerRole: "SUPPLIER" },
        { workspaceType: "SHIPMENT", workspaceId: shipmentId, documentType: "BILL_OF_LADING", status: "MISSING", ownerRole: "SUPPLIER" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.tradeDocument.deleteMany({ where: { workspaceId: { in: created.workspaces } } });
    await prisma.documentRequirement.deleteMany({ where: { workspaceId: { in: created.workspaces } } });
    await prisma.timelineEvent.deleteMany({ where: { workspaceId: { in: created.workspaces } } });
    await prisma.workspaceParticipant.deleteMany({ where: { workspaceId: { in: created.workspaces } } });
    await prisma.workspace.deleteMany({ where: { id: { in: created.workspaces } } });
  });

  it("ORDER: non-participant (beta tenant) is denied with 403 and gets no documents", async () => {
    const res = await callSummary(buyer2, "ORDER", orderId);
    expect(res.status).toBe(403);
    expect(res.body).toBeUndefined();
  });

  it("ORDER: owner (acme tenant) still receives 200 with the summary", async () => {
    const res = await callSummary(buyer1, "ORDER", orderId);
    expect(res.status).toBe(200);
    expect(res.body?.workspaceId).toBe(orderId);
    expect(res.body?.documents?.length).toBeGreaterThanOrEqual(1);
  });

  it("SHIPMENT: non-participant (beta tenant) is denied with 403 and gets no documents", async () => {
    const res = await callSummary(buyer2, "SHIPMENT", shipmentId);
    expect(res.status).toBe(403);
    expect(res.body).toBeUndefined();
  });

  it("SHIPMENT: owner (acme tenant) still receives 200 with the summary", async () => {
    const res = await callSummary(buyer1, "SHIPMENT", shipmentId);
    expect(res.status).toBe(200);
    expect(res.body?.workspaceId).toBe(shipmentId);
    expect(res.body?.documents?.length).toBeGreaterThanOrEqual(1);
  });
});
