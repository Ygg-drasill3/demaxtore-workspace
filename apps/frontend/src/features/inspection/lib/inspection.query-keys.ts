export const inspectionKeys = {
  all: ["inspection"] as const,
  detail: (id: string) => [...inspectionKeys.all, id] as const,
  timeline: (id: string) => [...inspectionKeys.all, id, "timeline"] as const,
  findings: (id: string) => [...inspectionKeys.all, id, "findings"] as const,
  documents: (id: string) => [...inspectionKeys.all, id, "documents"] as const,
  forOrder: (orderId: string) => [...inspectionKeys.all, "order", orderId] as const,
};
