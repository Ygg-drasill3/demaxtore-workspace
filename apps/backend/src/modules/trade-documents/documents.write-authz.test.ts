import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeDocumentsService } from "./documents.service.js";

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: vi.fn(), emitToWorkspace: vi.fn() },
}));

// H5 regression: every trade-document WRITE action must enforce
// canAccessTradeWorkspace (participant/admin). A non-participant of another
// tenant must be blocked with 403 before any mutation occurs.
describe("trade-documents write authorization (H5)", () => {
  const participantFindFirst = vi.fn();
  const tradeDocumentUpsert = vi.fn();
  const tradeDocumentUpdate = vi.fn();
  const documentRequirementCount = vi.fn();

  const db = {
    workspaceParticipant: { findFirst: participantFindFirst },
    tradeDocument: { upsert: tradeDocumentUpsert, update: tradeDocumentUpdate },
    documentRequirement: { count: documentRequirementCount },
  } as never;

  const outsider = { id: "u-beta", email: "b@beta.test", role: "BUYER" as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a non-participant from approving a document on another tenant's ORDER (403)", async () => {
    participantFindFirst.mockResolvedValue(null); // not a participant
    const svc = new TradeDocumentsService(db);

    await expect(
      svc.applyDocumentAction("ORDER", "order-x", "approve_document", outsider, { documentId: "d1" }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    // Must reject before performing any mutation.
    expect(participantFindFirst).toHaveBeenCalled();
    expect(tradeDocumentUpsert).not.toHaveBeenCalled();
    expect(tradeDocumentUpdate).not.toHaveBeenCalled();
    expect(documentRequirementCount).not.toHaveBeenCalled();
  });

  it("blocks a non-participant from uploading a document on another tenant's SHIPMENT (403)", async () => {
    participantFindFirst.mockResolvedValue(null);
    const svc = new TradeDocumentsService(db);

    await expect(
      svc.applyDocumentAction("SHIPMENT", "ship-x", "upload_document", outsider, {
        documentType: "BILL_OF_LADING",
        ownerRole: "SUPPLIER",
        fileId: "f1",
        fileName: "bl.pdf",
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(tradeDocumentUpsert).not.toHaveBeenCalled();
  });

  it("allows a participant past the workspace authorization gate", async () => {
    // Participant present → authz passes; we stop the flow at requirements lookup
    // to prove the gate was crossed without exercising the full mutation path.
    participantFindFirst.mockResolvedValue({ id: "p1", userId: outsider.id });
    documentRequirementCount.mockRejectedValue(new Error("__past_authz__"));
    const svc = new TradeDocumentsService(db);

    await expect(
      svc.applyDocumentAction("ORDER", "order-owned", "approve_document", outsider, { documentId: "d1" }),
    ).rejects.toThrow("__past_authz__");

    expect(participantFindFirst).toHaveBeenCalled();
  });
});
