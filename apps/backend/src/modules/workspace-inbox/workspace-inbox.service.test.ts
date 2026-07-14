import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceInboxService } from "./workspace-inbox.service.js";

const mockDb = {
  workspace: { findMany: vi.fn() },
  workspaceConversation: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
};

vi.mock("../../lib/staff-roles.js", () => ({
  hasPortfolioVisibility: vi.fn().mockReturnValue(false),
}));

describe("WorkspaceInboxService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.workspace.findMany.mockResolvedValue([
      {
        id: "ws-1",
        externalRef: "RFQ-100",
        type: "RFQ",
        state: "RFQ_OPEN",
        updatedAt: new Date("2026-01-10"),
        trashedAt: null,
        createdById: "u-buyer",
        rfqDetails: { title: "Olive Oil", targetMarket: "NL", selectedSupplierUserId: null },
        commodityBidDetails: null,
        orderWorkspace: null,
        participants: [
          {
            userId: "u-buyer",
            participantRole: "OWNER",
            user: { id: "u-buyer", displayName: "Buyer Co", email: "b@test.com", role: "BUYER" },
          },
        ],
      },
    ]);
    mockDb.workspaceConversation.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
  });

  it("returns inbox with summary and workspace cards", async () => {
    const svc = new WorkspaceInboxService(mockDb as never);
    const inbox = await svc.getInbox(
      { id: "u-buyer", email: "b@test.com", role: "BUYER" },
      {},
    );
    expect(inbox.summary.activeWorkspaces).toBeGreaterThanOrEqual(1);
    expect(inbox.workspaces[0].workspaceRef).toBe("RFQ-100");
    expect(inbox.workspaces[0].conversationUrl).toContain("focus=messages");
  });
});
