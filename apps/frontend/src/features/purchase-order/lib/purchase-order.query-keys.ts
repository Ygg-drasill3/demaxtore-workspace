export const purchaseOrderKeys = {
  all: ["purchase-order"] as const,
  lists: () => [...purchaseOrderKeys.all, "list"] as const,
  list: (filters?: unknown) => [...purchaseOrderKeys.lists(), filters] as const,
  /** @deprecated Prefer purchaseOrderKeys.list — kept for legacy portfolio keys. */
  portfolio: (role: "buyer" | "supplier", offset?: number) =>
    [role, "po-list", offset] as const,
  details: () => [...purchaseOrderKeys.all, "detail"] as const,
  detail: (purchaseOrderId: string) => [...purchaseOrderKeys.all, purchaseOrderId] as const,
  byOrder: (orderId: string) => [...purchaseOrderKeys.all, "order", orderId] as const,
  dashboard: () => [...purchaseOrderKeys.all, "dashboard"] as const,
  summary: () => [...purchaseOrderKeys.all, "summary"] as const,
  recent: () => [...purchaseOrderKeys.all, "recent"] as const,
  suppliers: () => [...purchaseOrderKeys.all, "suppliers"] as const,
  supplierSearch: (search: string) => [...purchaseOrderKeys.suppliers(), "search", search] as const,
  revisions: (purchaseOrderId: string) =>
    [...purchaseOrderKeys.detail(purchaseOrderId), "revisions"] as const,
  revision: (purchaseOrderId: string, revisionId: string) =>
    [...purchaseOrderKeys.revisions(purchaseOrderId), revisionId] as const,
  documents: (purchaseOrderId: string, filters?: unknown) =>
    [...purchaseOrderKeys.detail(purchaseOrderId), "documents", filters] as const,
  document: (purchaseOrderId: string, documentId: string) =>
    [...purchaseOrderKeys.documents(purchaseOrderId), documentId] as const,
  timeline: (purchaseOrderId: string, filters?: unknown) =>
    [...purchaseOrderKeys.detail(purchaseOrderId), "timeline", filters] as const,
  timelinePage: (purchaseOrderId: string, page: number, filters?: unknown) =>
    [...purchaseOrderKeys.timeline(purchaseOrderId, filters), "page", page] as const,
};
