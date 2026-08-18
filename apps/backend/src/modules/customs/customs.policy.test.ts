import { describe, expect, it, vi } from "vitest";
import {
  assertCustomsCaseAccess,
  assertBuyerCustomsListAccess,
  isCustomsDeniedRole,
} from "./customs.policy.js";

const caseRow = {
  id: "case-1",
  organisationId: "org-a",
  shipmentWorkspaceId: "shp-1",
  brokerUserId: "broker-1",
};

function prismaWithAssignment(found: boolean) {
  return {
    partnerAssignment: {
      findFirst: vi.fn().mockResolvedValue(found ? { id: "asg-1" } : null),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ organisationId: "org-a" }) },
  };
}

describe("Sprint 39 / Phase 17B customs assignment gates", () => {
  it("allows assigned CUSTOMS_BROKER", async () => {
    const prisma = prismaWithAssignment(true);
    await expect(
      assertCustomsCaseAccess(prisma as never, { id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" } as never, caseRow),
    ).resolves.toBe("BROKER");
  });

  it("denies unassigned CUSTOMS_BROKER", async () => {
    const prisma = prismaWithAssignment(false);
    await expect(
      assertCustomsCaseAccess(prisma as never, { id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" } as never, caseRow),
    ).rejects.toMatchObject({ status: 403, code: "PARTNER_NOT_ASSIGNED" });
  });

  it("denies revoked assignment (no active row)", async () => {
    const prisma = prismaWithAssignment(false);
    await expect(
      assertCustomsCaseAccess(prisma as never, { id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" } as never, caseRow),
    ).rejects.toMatchObject({ status: 403, code: "PARTNER_NOT_ASSIGNED" });
  });

  it("denies Origin Agent customs case access", async () => {
    const prisma = prismaWithAssignment(true);
    await expect(
      assertCustomsCaseAccess(prisma as never, { id: "oa-1", role: "ORIGIN_AGENT", email: "oa@x.com" } as never, caseRow),
    ).rejects.toMatchObject({ status: 403, code: "CUSTOMS_FORBIDDEN" });
  });

  it("denies Trucker customs case access", async () => {
    const prisma = prismaWithAssignment(true);
    await expect(
      assertCustomsCaseAccess(prisma as never, { id: "tr-1", role: "TRUCKER", email: "t@x.com" } as never, caseRow),
    ).rejects.toMatchObject({ status: 403, code: "CUSTOMS_FORBIDDEN" });
  });

  it("denies broker organisation-wide customs list", () => {
    expect(() =>
      assertBuyerCustomsListAccess({ id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" } as never),
    ).toThrow();
  });

  it("marks Origin Agent and Trucker as denied customs roles", () => {
    expect(isCustomsDeniedRole({ role: "ORIGIN_AGENT" } as never)).toBe(true);
    expect(isCustomsDeniedRole({ role: "TRUCKER" } as never)).toBe(true);
    expect(isCustomsDeniedRole({ role: "CUSTOMS_BROKER" } as never)).toBe(false);
  });
});
