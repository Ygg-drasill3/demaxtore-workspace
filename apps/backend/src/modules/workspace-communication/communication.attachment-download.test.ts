import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommunicationService } from "./communication.service.js";
import { buildContentDisposition } from "../../lib/content-disposition.js";

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: vi.fn() },
}));

const canAccessCommWorkspace = vi.fn();
const resolveWorkspace = vi.fn();
const buildVisibilityContext = vi.fn();
const canViewMessage = vi.fn();

vi.mock("./communication.policy.js", () => ({
  canAccessCommWorkspace: (...args: unknown[]) => canAccessCommWorkspace(...args),
  resolveWorkspace: (...args: unknown[]) => resolveWorkspace(...args),
  buildVisibilityContext: (...args: unknown[]) => buildVisibilityContext(...args),
}));

vi.mock("./communication.visibility.js", () => ({
  assertCanCreateVisibility: vi.fn(),
  canViewMessage: (...args: unknown[]) => canViewMessage(...args),
}));

vi.mock("./communication.notifications.js", () => ({
  notifyCommEvent: vi.fn(),
}));

vi.mock("../../lib/file-storage.js", () => ({
  writeStoredFile: vi.fn().mockResolvedValue({ storageKey: "sk-1", absPath: "/tmp/sk-1" }),
  deleteStoredFile: vi.fn().mockResolvedValue(undefined),
  assertStoredFileExists: vi.fn().mockResolvedValue("/tmp/sk-1"),
}));

vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const BUYER = { id: "u-buyer", email: "buyer@test.io", role: "BUYER" as const };
const SUPPLIER = { id: "u-supplier", email: "sup@test.io", role: "SUPPLIER" as const };
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ATT_ID = "22222222-2222-4222-8222-222222222222";

describe("CommunicationService — attachment download (ATT-001)", () => {
  const findUnique = vi.fn();
  const db = { workspaceMessageAttachment: { findUnique } };

  beforeEach(() => {
    vi.clearAllMocks();
    canAccessCommWorkspace.mockResolvedValue(true);
    resolveWorkspace.mockResolvedValue({
      workspaceType: "ORDER",
      workspaceId: ORDER_ID,
      auditWorkspaceId: ORDER_ID,
    });
    buildVisibilityContext.mockResolvedValue({ participantUserIds: [BUYER.id, SUPPLIER.id] });
    canViewMessage.mockReturnValue(true);
    findUnique.mockResolvedValue({
      id: ATT_ID,
      workspaceType: "ORDER",
      workspaceId: ORDER_ID,
      fileName: "Türkçe dosya.pdf",
      storageKey: "sk-1",
      mimeType: "application/pdf",
      fileSizeBytes: 128,
      messageId: "msg-1",
      message: { id: "msg-1", status: "ACTIVE", visibility: "ALL_PARTICIPANTS" },
    });
  });

  it("allows authorized buyer to download", async () => {
    const svc = new CommunicationService(db as never);
    const file = await svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, BUYER);
    expect(file.fileName).toBe("Türkçe dosya.pdf");
    expect(file.storageKey).toBe("sk-1");
  });

  it("allows authorized supplier to download", async () => {
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, SUPPLIER),
    ).resolves.toMatchObject({ mimeType: "application/pdf" });
  });

  it("returns 403 when user cannot access workspace", async () => {
    canAccessCommWorkspace.mockResolvedValueOnce(false);
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, BUYER),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns 404 for cross-tenant attachment id", async () => {
    findUnique.mockResolvedValueOnce({
      id: ATT_ID,
      workspaceType: "ORDER",
      workspaceId: "other-workspace-id",
      message: null,
    });
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, BUYER),
    ).rejects.toMatchObject({ status: 404, code: "ATTACHMENT_NOT_FOUND" });
  });

  it("returns 404 when attachment record missing", async () => {
    findUnique.mockResolvedValueOnce(null);
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, BUYER),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns 403 when message visibility blocks viewer", async () => {
    canViewMessage.mockReturnValueOnce(false);
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, SUPPLIER),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns 404 when physical file missing", async () => {
    const { assertStoredFileExists } = await import("../../lib/file-storage.js");
    vi.mocked(assertStoredFileExists).mockRejectedValueOnce(new Error("missing"));
    const svc = new CommunicationService(db as never);
    await expect(
      svc.getAttachmentForDownload("ORDER", ORDER_ID, ATT_ID, BUYER),
    ).rejects.toMatchObject({ status: 404, code: "ATTACHMENT_FILE_MISSING" });
  });
});

describe("buildContentDisposition", () => {
  it("encodes unicode filenames safely", () => {
    const header = buildContentDisposition('Türkçe "rapor".pdf');
    expect(header).toContain("attachment");
    expect(header).toContain("filename*=");
    expect(header).not.toMatch(/[\r\n]/);
  });

  it("sanitizes path traversal in filename", () => {
    const header = buildContentDisposition("../../etc/passwd");
    expect(header).toContain("passwd");
    expect(header).not.toContain("/");
  });
});
