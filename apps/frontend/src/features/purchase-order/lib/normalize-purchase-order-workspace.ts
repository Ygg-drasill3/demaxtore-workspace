import type {
  PurchaseOrderLine,
  PurchaseOrderSummary,
} from "@dmx/contracts/purchase-order";
import { canonicalizePurchaseOrderSource } from "@dmx/contracts/purchase-order";

/** Normalize API summary at the boundary for workspace rendering. */
export function normalizePurchaseOrderWorkspace(summary: PurchaseOrderSummary): PurchaseOrderSummary {
  const po = summary.purchaseOrder;
  const source = canonicalizePurchaseOrderSource(po.source);
  const documents =
    po.documents?.length
      ? po.documents.map((d) => ({
          ...d,
          documentUrl: d.documentUrl || (d as { url?: string }).url || "",
          fileName: d.fileName || "Document",
        })).filter((d) => Boolean(d.documentUrl))
      : po.documentUrl
        ? [{
            id: `po-doc-${po.id}`,
            fileName: po.documentFileName ?? `PO-${po.poNumber}.pdf`,
            documentUrl: po.documentUrl,
            mimeType: "application/pdf",
            uploadedAt: po.issuedAt ?? po.createdAt,
          }]
        : [];

  return {
    ...summary,
    purchaseOrder: {
      ...po,
      source,
      buyerReference: po.buyerReference ?? null,
      notes: po.notes ?? null,
      expectedDeliveryDate: po.expectedDeliveryDate ?? null,
      destinationCountry: po.destinationCountry ?? null,
      destinationPort: po.destinationPort ?? null,
      rfqWorkspaceId: po.rfqWorkspaceId ?? null,
      commodityBidWorkspaceId: po.commodityBidWorkspaceId ?? null,
      parentPurchaseOrderId: po.parentPurchaseOrderId ?? null,
      documents,
    },
    lines: (summary.lines ?? []).map(normalizeLine),
    revisions: summary.revisions ?? [],
    acknowledgements: summary.acknowledgements ?? [],
    amendments: summary.amendments ?? [],
  };
}

function normalizeLine(line: PurchaseOrderLine): PurchaseOrderLine {
  return {
    ...line,
    productName: line.productName ?? line.description?.split(" — ")[0] ?? line.description,
    productCode: line.productCode ?? line.sku,
    specification: line.specification ?? null,
    packaging: line.packaging ?? null,
    unit: line.unit ?? null,
  };
}
