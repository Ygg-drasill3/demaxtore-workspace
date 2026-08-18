import type { DocumentCenterRow } from "@dmx/contracts/document-center";

export interface PoDocumentGroup {
  key: string;
  poNumber: string | null;
  label: string;
  supplierName: string | null;
  tradeId: string | null;
  orderWorkspaceUrl: string | null;
  items: DocumentCenterRow[];
}

/** Group document-center rows by PO number; RFQ-only docs land in a pre-PO bucket. */
export function groupDocumentsByPo(items: DocumentCenterRow[]): PoDocumentGroup[] {
  const map = new Map<string, PoDocumentGroup>();

  for (const row of items) {
    const key = row.poNumber ?? `rfq:${row.tradeId ?? row.relatedEntityRef ?? row.id}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(row);
      if (!existing.supplierName && row.supplierName) existing.supplierName = row.supplierName;
    } else {
      map.set(key, {
        key,
        poNumber: row.poNumber,
        label: row.poNumber ?? row.tradeId ?? row.relatedEntityRef ?? "Pre-PO",
        supplierName: row.supplierName,
        tradeId: row.tradeId,
        orderWorkspaceUrl: row.orderWorkspaceUrl,
        items: [row],
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (!a.poNumber && b.poNumber) return 1;
    if (a.poNumber && !b.poNumber) return -1;
    return (b.poNumber ?? b.label).localeCompare(a.poNumber ?? a.label);
  });
}
