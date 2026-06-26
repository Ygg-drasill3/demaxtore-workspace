import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../db/prisma.js";
import { canAccessWorkspace } from "../modules/workspace/workspace.policy.js";
import { TEST_USER_EMAILS } from "../test/fixture-users.js";

describe("Workspace socket ACL routing", () => {
  let orderId: string;
  let supplierId: string;
  let buyerId: string;
  const createdWorkspaceIds: string[] = [];

  beforeAll(async () => {
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAILS.buyer1 } });
    const supplier = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAILS.supplier1 } });
    buyerId = buyer.id;
    supplierId = supplier.id;

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const order = await prisma.workspace.create({
      data: {
        externalRef: `ORD-ACL-${suffix}`,
        type: "ORDER",
        state: "ORDER_CREATED",
        createdById: buyer.id,
        participants: {
          create: [
            { userId: buyer.id, participantRole: "OWNER" },
            { userId: supplier.id, participantRole: "COUNTERPARTY" },
          ],
        },
      },
    });
    orderId = order.id;
    createdWorkspaceIds.push(order.id);
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length) {
      await prisma.workspace.deleteMany({ where: { id: { in: createdWorkspaceIds } } });
    }
  });

  it("supplier participant can access ORDER workspace (not RFQ-only deny)", async () => {
    const ok = await canAccessWorkspace(prisma, {
      id: supplierId,
      role: "SUPPLIER",
      email: TEST_USER_EMAILS.supplier1,
    }, orderId);
    expect(ok).toBe(true);
  });

  it("unrelated buyer cannot access ORDER workspace", async () => {
    const buyer2 = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAILS.buyer2 } });
    const ok = await canAccessWorkspace(prisma, {
      id: buyer2.id,
      role: "BUYER",
      email: buyer2.email,
    }, orderId);
    expect(ok).toBe(false);
  });
});
