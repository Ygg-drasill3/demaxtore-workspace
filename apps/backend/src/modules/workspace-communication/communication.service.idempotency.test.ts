import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { CommunicationService } from "./communication.service.js";

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: vi.fn() },
}));

vi.mock("./communication.policy.js", () => ({
  canAccessCommWorkspace: vi.fn().mockResolvedValue(true),
  resolveWorkspace: vi.fn().mockResolvedValue({
    workspaceType: "ORDER",
    workspaceId: "order-1",
    auditWorkspaceId: "audit-1",
  }),
  buildVisibilityContext: vi.fn().mockResolvedValue({
    participantUserIds: ["u-buyer", "u-supplier"],
    buyerUserIds: ["u-buyer"],
    supplierUserIds: ["u-supplier"],
  }),
}));

vi.mock("./communication.visibility.js", () => ({
  assertCanCreateVisibility: vi.fn(),
  canViewMessage: vi.fn().mockReturnValue(true),
}));

vi.mock("./communication.notifications.js", () => ({
  notifyCommEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return {
    ...actual,
    getUnifiedMessagingWriteMode: vi.fn(() => "unified_primary_legacy_mirror"),
  };
});

const ACTOR = { id: "u-buyer", email: "buyer@test.io", role: "BUYER" as const };
const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

describe("CommunicationService — message idempotency (MSG-001)", () => {
  const workspaceMessageCreate = vi.fn();
  const workspaceMessageFindFirst = vi.fn();
  const workspaceConversationFindUnique = vi.fn();
  const transaction = vi.fn();

  const db = {
    workspaceMessage: {
      create: workspaceMessageCreate,
      findFirst: workspaceMessageFindFirst,
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    workspaceConversation: {
      findUnique: workspaceConversationFindUnique,
      create: vi.fn(),
    },
    workspaceMention: { createMany: vi.fn() },
    workspaceMessageAttachment: { updateMany: vi.fn() },
    workspaceParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceMessageDelivery: { create: vi.fn() },
    messagingOutboxEvent: { create: vi.fn().mockResolvedValue({ id: "outbox-1" }) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    workspace: { findUnique: vi.fn().mockResolvedValue({ state: "CONFIRMED" }) },
    auditLog: { create: vi.fn() },
    timelineEvent: { create: vi.fn() },
    $transaction: transaction,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceConversationFindUnique.mockResolvedValue({ id: "conv-1" });
    workspaceMessageFindFirst.mockResolvedValue(null);
    transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<string>) => fn(db));
    workspaceMessageCreate.mockResolvedValue({ id: "msg-new" });
  });

  it("returns existing message without creating a duplicate when clientMessageId repeats", async () => {
    workspaceMessageFindFirst.mockResolvedValueOnce({ id: "msg-existing" });

    const svc = new CommunicationService(db as never);
    await svc.applyCommunicationAction("ORDER", "order-1", "create_message", ACTOR, {
      body: "Hello once",
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      clientMessageId: CLIENT_ID,
    });

    expect(workspaceMessageCreate).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("stores clientMessageId on first create", async () => {
    const svc = new CommunicationService(db as never);
    await svc.applyCommunicationAction("ORDER", "order-1", "create_message", ACTOR, {
      body: "First send",
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      clientMessageId: CLIENT_ID,
    });

    expect(workspaceMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientMessageId: CLIENT_ID,
          authorUserId: ACTOR.id,
        }),
      }),
    );
  });

  it("handles concurrent duplicate insert via unique constraint without side effects", async () => {
    workspaceMessageFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "msg-race" });

    const uniqueError = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "test",
    });
    workspaceMessageCreate.mockRejectedValueOnce(uniqueError);
    transaction.mockImplementationOnce(async (fn: (tx: typeof db) => Promise<string>) => fn(db));

    const svc = new CommunicationService(db as never);
    await expect(
      svc.applyCommunicationAction("ORDER", "order-1", "create_message", ACTOR, {
        body: "Race",
        messageType: "MESSAGE",
        visibility: "ALL_PARTICIPANTS",
        clientMessageId: CLIENT_ID,
      }),
    ).resolves.toBeDefined();

    expect(workspaceMessageCreate).toHaveBeenCalledTimes(1);
    expect(workspaceMessageFindFirst).toHaveBeenCalledTimes(2);
  });

  it("scopes idempotency to sender — another user with same clientMessageId still creates", async () => {
    workspaceMessageFindFirst.mockResolvedValue(null);

    const svc = new CommunicationService(db as never);
    await svc.applyCommunicationAction("ORDER", "order-1", "create_message", {
      id: "u-supplier",
      email: "sup@test.io",
      role: "SUPPLIER",
    }, {
      body: "Supplier reply",
      messageType: "MESSAGE",
      visibility: "ALL_PARTICIPANTS",
      clientMessageId: CLIENT_ID,
    });

    expect(workspaceMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorUserId: "u-supplier",
          clientMessageId: CLIENT_ID,
        }),
      }),
    );
  });
});
