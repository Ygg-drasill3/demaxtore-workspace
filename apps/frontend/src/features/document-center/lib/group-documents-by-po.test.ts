import { describe, it, expect } from "vitest";
import { groupDocumentsByPo } from "./group-documents-by-po";
import type { DocumentCenterRow } from "@dmx/contracts/document-center";

function row(partial: Partial<DocumentCenterRow> & Pick<DocumentCenterRow, "id">): DocumentCenterRow {
  return {
    source: "TRADE",
    sourceDocumentId: partial.id,
    documentName: "doc",
    documentType: "COMMERCIAL_INVOICE",
    category: "Commercial Invoice",
    tradeId: "RFQ-2026-0001",
    tradeRootId: "rfq-1",
    tradeWorkspaceUrl: null,
    relatedEntityType: "ORDER",
    relatedEntityId: "order-1",
    relatedEntityRef: "ORD-1",
    poNumber: null,
    poOrderId: null,
    orderWorkspaceUrl: null,
    buyerName: null,
    supplierName: null,
    shipmentRef: null,
    status: "Uploaded",
    version: 1,
    uploadedByName: null,
    uploadedById: null,
    uploadedAt: null,
    reviewOwnerName: null,
    lastUpdated: "2026-01-01",
    isRequired: false,
    openAlertCount: 0,
    downloadUrl: null,
    detailUrl: `/documents/TRADE:${partial.id}`,
    ...partial,
  };
}

describe("groupDocumentsByPo", () => {
  it("groups rows with the same PO number", () => {
    const groups = groupDocumentsByPo([
      row({ id: "a", poNumber: "PO-AAA", supplierName: "Acme" }),
      row({ id: "b", poNumber: "PO-AAA" }),
      row({ id: "c", poNumber: "PO-BBB", supplierName: "Beta" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.poNumber === "PO-AAA")?.items).toHaveLength(2);
    expect(groups.find((g) => g.poNumber === "PO-BBB")?.items).toHaveLength(1);
  });

  it("puts pre-PO RFQ docs in a separate bucket", () => {
    const groups = groupDocumentsByPo([
      row({ id: "rfq", source: "RFQ", poNumber: null, tradeId: "RFQ-2026-0099" }),
      row({ id: "po", poNumber: "PO-XYZ" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.some((g) => g.poNumber === null)).toBe(true);
  });
});
