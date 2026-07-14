import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  issuePasswordlessLinkInternal,
  consumePasswordlessAccess,
  revokeSupersededDeliveryTokens,
  reuseDeliveryPasswordlessLink,
} from "./passwordless-access.service.js";
import { prisma } from "../../db/prisma.js";
import { bootstrapWorkspaceConversation } from "../conversation-hub/conversation-bootstrap.js";

vi.mock("../conversation-hub/conversation-bootstrap.js", () => ({
  bootstrapWorkspaceConversation: vi.fn().mockResolvedValue(undefined),
}));

describe("passwordless-access consume (scanner-safe contract)", () => {
  const deliveryId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  beforeEach(async () => {
    vi.mocked(bootstrapWorkspaceConversation).mockImplementation(async (db, wt, wid) => {
      await db.workspaceConversation.upsert({
        where: { workspaceType_workspaceId: { workspaceType: wt, workspaceId: wid } },
        create: { workspaceType: wt, workspaceId: wid, status: "ACTIVE" },
        update: { status: "ACTIVE" },
      });
    });

    await prisma.passwordlessAccessLog.deleteMany({});
    await prisma.passwordlessAccessToken.deleteMany({ where: { emailDeliveryId: deliveryId } });
    await prisma.emailNotificationDelivery.deleteMany({ where: { id: deliveryId } });
  });

  async function seedRfqWorkspace() {
    const buyer = await prisma.user.findFirst({ where: { email: "buyer@dema.test" } });
    if (!buyer) throw new Error("fixture buyer missing — run seedTestUsers");

    const ws = await prisma.workspace.create({
      data: {
        externalRef: `PW-TEST-${Date.now()}`,
        type: "RFQ",
        state: "DRAFT",
        createdById: buyer.id,
        participants: {
          create: [{ userId: buyer.id, participantRole: "OWNER" }],
        },
      },
    });

    await bootstrapWorkspaceConversation(prisma, "RFQ", ws.id);

    await prisma.emailNotificationDelivery.create({
      data: {
        id: deliveryId,
        notificationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        userId: buyer.id,
        subject: "test",
        templateKey: "test",
        recipientEmail: buyer.email,
        provider: "console",
        status: "QUEUED",
      },
    });

    return { buyer, ws };
  }

  it("does not consume token until explicit POST consume", async () => {
    const { buyer, ws } = await seedRfqWorkspace();
    const link = await issuePasswordlessLinkInternal({
      userId: buyer.id,
      workspaceType: "RFQ",
      workspaceId: ws.id,
      ttl: "ONE_HOUR",
      singleUse: true,
      emailDeliveryId: deliveryId,
    });

    const row = await prisma.passwordlessAccessToken.findUnique({ where: { id: link.tokenId } });
    expect(row?.consumedAt).toBeNull();

    const tokenParam = new URL(link.accessUrl).searchParams.get("token");
    expect(tokenParam).toBeTruthy();

    // Simulated interstitial GET — no consume call yet
    expect(row?.consumedAt).toBeNull();
  });

  it("explicit POST consumes once; second POST fails", async () => {
    const { buyer, ws } = await seedRfqWorkspace();
    const link = await issuePasswordlessLinkInternal({
      userId: buyer.id,
      workspaceType: "RFQ",
      workspaceId: ws.id,
      ttl: "ONE_HOUR",
      singleUse: true,
      emailDeliveryId: deliveryId,
    });
    const token = new URL(link.accessUrl).searchParams.get("token")!;

    const first = await consumePasswordlessAccess(token, { secure: true, userAgent: "Mozilla/5.0 Test" });
    expect(first.accessMode).toBe("passwordless");

    await expect(
      consumePasswordlessAccess(token, { secure: true, userAgent: "Mozilla/5.0 Test" }),
    ).rejects.toThrow();
  });

  it("revokes superseded delivery tokens before retry replacement", async () => {
    const { buyer, ws } = await seedRfqWorkspace();
    const first = await issuePasswordlessLinkInternal({
      userId: buyer.id,
      workspaceType: "RFQ",
      workspaceId: ws.id,
      ttl: "ONE_HOUR",
      singleUse: true,
      emailDeliveryId: deliveryId,
    });

    await revokeSupersededDeliveryTokens(deliveryId);

    const reused = await reuseDeliveryPasswordlessLink(first.tokenId);
    expect(reused).toBeNull();

    const old = await prisma.passwordlessAccessToken.findUnique({ where: { id: first.tokenId } });
    expect(old?.revokedAt).not.toBeNull();
  });
});
