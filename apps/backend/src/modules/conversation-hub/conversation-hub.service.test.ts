import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationHubService } from "./conversation-hub.service.js";

const mockDb = {
  workspaceConversation: {
    findUniqueOrThrow: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  shipmentWorkspace: {
    findFirst: vi.fn(),
  },
  workspaceMessage: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  workspaceParticipant: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  workspaceMessageDelivery: {
    upsert: vi.fn(),
  },
};

vi.mock("../workspace-communication/communication.policy.js", () => ({
  canAccessCommWorkspace: vi.fn().mockResolvedValue(true),
  resolveWorkspace: vi.fn().mockResolvedValue({
    workspaceType: "RFQ",
    workspaceId: "ws-1",
    auditWorkspaceId: "ws-1",
  }),
  buildVisibilityContext: vi.fn().mockResolvedValue({}),
}));

vi.mock("../workspace-communication/communication.visibility.js", () => ({
  canViewMessage: vi.fn().mockReturnValue(true),
}));

vi.mock("./conversation-bootstrap.js", () => ({
  bootstrapWorkspaceConversation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../workspace-communication/communication.service.js", () => ({
  CommunicationService: vi.fn().mockImplementation(() => ({
    applyCommunicationAction: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: vi.fn() },
}));

describe("ConversationHubService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.workspaceConversation.findUniqueOrThrow.mockResolvedValue({
      id: "conv-1",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01"),
    });
    mockDb.workspaceMessage.findMany.mockResolvedValue([
      {
        id: "msg-1",
        conversationId: "conv-1",
        messageType: "SYSTEM_EVENT",
        body: "Workspace created",
        authorUserId: null,
        visibility: "ALL_PARTICIPANTS",
        channelSource: "WORKSPACE",
        metadata: { systemEventType: "WORKSPACE_CREATED" },
        parentMessageId: null,
        editedAt: null,
        createdAt: new Date("2026-01-01"),
        mentions: [],
        readReceipts: [],
        deliveries: [],
        attachments: [],
      },
    ]);
    mockDb.workspaceParticipant.findMany.mockResolvedValue([
      {
        userId: "u-buyer",
        participantRole: "OWNER",
        user: {
          id: "u-buyer",
          email: "buyer@test.com",
          displayName: "Buyer",
          role: "BUYER",
          whatsappPhone: null,
          organisation: { name: "Acme" },
        },
      },
    ]);
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.workspace.findUnique.mockResolvedValue({
      externalRef: "RFQ-001",
      state: "RFQ_OPEN",
      type: "RFQ",
      rfqDetails: null,
      orderWorkspace: null,
    });
    mockDb.shipmentWorkspace.findFirst.mockResolvedValue(null);
  });

  it("getHub returns timeline with system events flagged", async () => {
    const svc = new ConversationHubService(mockDb as never);
    const hub = await svc.getHub("RFQ", "ws-1", {
      id: "u-buyer",
      email: "buyer@test.com",
      role: "BUYER",
    });

    expect(hub.id).toBe("conv-1");
    expect(hub.timeline).toHaveLength(1);
    expect(hub.timeline[0].isSystemEvent).toBe(true);
    expect(hub.timeline[0].authorName).toBe("DeMaxtore System");
    expect(hub.participants[0].role).toBe("BUYER");
    expect(hub.header.workspaceRef).toBe("RFQ-001");
    expect(hub.summary.currentStage).toBe("RFQ OPEN");
    expect(hub.pendingActions).toBeDefined();
    expect(hub.decisions).toBeDefined();
    expect(hub.attachmentLibrary.totalCount).toBe(0);
  });

  it("search filters timeline by keyword", async () => {
    const svc = new ConversationHubService(mockDb as never);
    const result = await svc.search("RFQ", "ws-1", { id: "u-buyer", email: "b@test.com", role: "BUYER" }, {
      q: "created",
    });
    expect(result.total).toBe(1);
    expect(result.items[0].body).toContain("Workspace created");
  });

  it("search returns empty when keyword does not match", async () => {
    const svc = new ConversationHubService(mockDb as never);
    const result = await svc.search("RFQ", "ws-1", { id: "u-buyer", email: "b@test.com", role: "BUYER" }, {
      q: "nonexistent",
    });
    expect(result.total).toBe(0);
  });
});
