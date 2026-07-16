import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const AUTH_USER = { id: "u-buyer", email: "buyer@test.io", role: "BUYER" as const };

vi.mock("../../middleware/auth.js", () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: typeof AUTH_USER }).user = AUTH_USER;
    next();
  },
}));

const getAttachmentForDownload = vi.fn();

vi.mock("../workspace-communication/communication.service.js", () => ({
  CommunicationService: vi.fn().mockImplementation(() => ({
    getAttachmentForDownload,
    uploadAttachment: vi.fn(),
  })),
}));

vi.mock("./conversation-hub.service.js", () => ({
  ConversationHubService: vi.fn().mockImplementation(() => ({
    getHub: vi.fn(),
    search: vi.fn(),
    createTimelineItem: vi.fn(),
  })),
}));

vi.mock("../../lib/file-storage.js", () => ({
  streamStoredFileToResponse: vi.fn(async (_key: string, res: express.Response, opts) => {
    res.setHeader("Content-Type", opts.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${opts.fileName}"`);
    res.send("file-bytes");
  }),
}));

const { conversationHubRouter } = await import("./conversation-hub.routes.js");

function makeApp() {
  const app = express();
  app.use(
    "/api/workspaces/:workspaceType/:workspaceId/conversation",
    conversationHubRouter,
  );
  return app;
}

describe("conversation hub attachment download route", () => {
  beforeEach(() => {
    getAttachmentForDownload.mockReset().mockResolvedValue({
      storageKey: "sk-1",
      fileName: "comm.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 9,
    });
  });

  it("returns file bytes for authorized download", async () => {
    const res = await request(makeApp()).get(
      "/api/workspaces/order/ws-1/conversation/attachments/att-1/download",
    );
    expect(res.status).toBe(200);
    expect(getAttachmentForDownload).toHaveBeenCalled();
  });
});
