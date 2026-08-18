import { describe, expect, it } from "vitest";
import {
  assertDocumentActionRole,
  assertTruckerUploadDocumentType,
} from "./documents.policy.js";

describe("trucker POD upload policy", () => {
  it("allows TRUCKER upload_document role", () => {
    expect(() => assertDocumentActionRole("upload_document", "TRUCKER" as never)).not.toThrow();
  });

  it("allows TRUCKER to upload PROOF_OF_DELIVERY only", () => {
    expect(() => assertTruckerUploadDocumentType("TRUCKER", "PROOF_OF_DELIVERY")).not.toThrow();
    expect(() => assertTruckerUploadDocumentType("TRUCKER", "COMMERCIAL_INVOICE")).toThrow(
      /TRUCKER_POD_ONLY/,
    );
  });

  it("does not restrict SUPPLIER document types", () => {
    expect(() => assertTruckerUploadDocumentType("SUPPLIER", "COMMERCIAL_INVOICE")).not.toThrow();
  });
});
