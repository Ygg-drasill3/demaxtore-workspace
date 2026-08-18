import { describe, expect, it } from "vitest";
import {
  mapToCommercialDocumentCategory,
  COMMERCIAL_DOCUMENT_CATEGORIES,
} from "./commercial-document";
import {
  CommercialDocumentListQuerySchema,
  CommercialDocumentUploadMetaSchema,
  CommercialDocumentDtoSchema,
} from "./commercial-document.zod";

describe("mapToCommercialDocumentCategory", () => {
  it("maps legacy aliases", () => {
    expect(mapToCommercialDocumentCategory("PO")).toBe("PURCHASE_ORDER");
    expect(mapToCommercialDocumentCategory("PI")).toBe("PROFORMA_INVOICE");
    expect(mapToCommercialDocumentCategory("INSURANCE_CERTIFICATE")).toBe("INSURANCE");
    expect(mapToCommercialDocumentCategory("weird")).toBe("OTHER");
  });

  it("accepts canonical values", () => {
    for (const c of COMMERCIAL_DOCUMENT_CATEGORIES) {
      expect(mapToCommercialDocumentCategory(c)).toBe(c);
    }
  });
});

describe("CommercialDocumentUploadMetaSchema", () => {
  it("requires category", () => {
    expect(CommercialDocumentUploadMetaSchema.safeParse({ category: "COMMERCIAL_INVOICE" }).success).toBe(true);
    expect(CommercialDocumentUploadMetaSchema.safeParse({ category: "NOPE" }).success).toBe(false);
  });
});

describe("CommercialDocumentListQuerySchema", () => {
  it("defaults page and sort", () => {
    const q = CommercialDocumentListQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(25);
    expect(q.sort).toBe("uploadedAt");
  });
});

describe("CommercialDocumentDtoSchema", () => {
  it("accepts capability flags", () => {
    const ok = CommercialDocumentDtoSchema.safeParse({
      id: "COMMERCIAL:11111111-1111-1111-1111-111111111111",
      purchaseOrderId: "22222222-2222-2222-2222-222222222222",
      category: "PACKING_LIST",
      source: "PURCHASE_ORDER",
      fileName: "pack.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-07-28T00:00:00.000Z",
      canPreview: true,
      canDownload: true,
      canReplace: true,
      canDelete: false,
    });
    expect(ok.success).toBe(true);
  });
});
