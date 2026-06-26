import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentCenterService } from "./document-center.service.js";

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: vi.fn(), emitToWorkspace: vi.fn() },
}));

// Regression: document-center requestRevision (POST /api/documents/:id/request-revision)
// must enforce the same workspace access + role checks as approve/reject. Without
// it, any authenticated user can overwrite another tenant's trade document review
// (cross-tenant IDOR write + RBAC bypass).
describe("document-center requestRevision authorization", () => {
  const tradeDocumentFindUnique = vi.fn();
  const participantFindFirst = vi.fn();
  const tradeDocumentUpdate = vi.fn();
  const transaction = vi.fn();

  const db = {
    tradeDocument: { findUnique: tradeDocumentFindUnique, update: tradeDocumentUpdate },
    workspaceParticipant: { findFirst: participantFindFirst },
    $transaction: transaction,
  } as never;

  const outsider = { id: "u-beta", email: "b@beta.test", role: "BUYER" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    tradeDocumentFindUnique.mockResolvedValue({
      id: "doc-1",
      workspaceType: "ORDER",
      workspaceId: "order-owned-by-acme",
    });
  });

  it("blocks a non-participant from requesting revision on another tenant's document (403)", async () => {
    participantFindFirst.mockResolvedValue(null); // not a participant
    const svc = new DocumentCenterService(db);

    await expect(svc.requestRevision(outsider, "TRADE:doc-1", "please fix")).rejects.toMatchObject({
      status: 403,
    });

    // Must reject before mutating anything.
    expect(transaction).not.toHaveBeenCalled();
    expect(tradeDocumentUpdate).not.toHaveBeenCalled();
  });

  it("blocks a participant with a forbidden role (e.g. SUPPLIER) from requesting revision (403)", async () => {
    participantFindFirst.mockResolvedValue({ id: "p1", userId: "u-supplier" });
    const supplier = { id: "u-supplier", email: "s@acme.test", role: "SUPPLIER" as const };
    const svc = new DocumentCenterService(db);

    await expect(svc.requestRevision(supplier, "TRADE:doc-1", "please fix")).rejects.toMatchObject({
      status: 403,
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});
