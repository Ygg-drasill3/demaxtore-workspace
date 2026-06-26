import { describe, it, expect, beforeAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

describe("State guard (Sprint 3.9)", () => {
  let workspaceId: string;
  let priorState: string;

  beforeAll(async () => {
    const ws = await prisma.workspace.findFirst({
      where: { type: "RFQ" },
      select: { id: true, state: true },
    });
    if (!ws) throw new Error("No RFQ workspace in DB — run seed");
    workspaceId = ws.id;
    priorState = ws.state;
  });

  it("blocks direct UPDATE of workspaces.state without FSM authorisation", async () => {
    const illegalTarget = priorState === "RFQ_OPEN" ? "PO_ISSUED" : "RFQ_OPEN";
    await expect(
      prisma.$executeRaw(
        Prisma.sql`UPDATE workspaces SET state = ${illegalTarget} WHERE id = ${workspaceId}::uuid`,
      ),
    ).rejects.toThrow(/applyTransition|check_violation/i);
  });

  it("allows state change when app.fsm_authorised is set in transaction", async () => {
    const target = priorState === "RFQ_OPEN" ? "QUOTATIONS_CLOSED" : "RFQ_OPEN";
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
      await tx.$executeRaw(
        Prisma.sql`UPDATE workspaces SET state = ${target} WHERE id = ${workspaceId}::uuid`,
      );
    });
    const after = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { state: true },
    });
    expect(after.state).toBe(target);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
      await tx.$executeRaw(
        Prisma.sql`UPDATE workspaces SET state = ${priorState} WHERE id = ${workspaceId}::uuid`,
      );
    });
  });
});
