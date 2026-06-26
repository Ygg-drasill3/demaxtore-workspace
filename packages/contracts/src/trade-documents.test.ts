import { describe, expect, it } from "vitest";
import { RejectDocumentPayload } from "./trade-documents.zod";

describe("RejectDocumentPayload", () => {
  it("requires reason", () => {
    const r = RejectDocumentPayload.safeParse({
      documentId: "00000000-0000-4000-8000-000000000099",
      reason: "Blurry scan",
    });
    expect(r.success).toBe(true);
  });

  it("rejects short reason", () => {
    expect(
      RejectDocumentPayload.safeParse({
        documentId: "00000000-0000-4000-8000-000000000099",
        reason: "no",
      }).success,
    ).toBe(false);
  });
});
