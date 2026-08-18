export const shipmentKeys = {
  all: ["shipment"] as const,
  detail: (id: string) => [...shipmentKeys.all, id] as const,
  timeline: (id: string) => [...shipmentKeys.all, id, "timeline"] as const,
  containers: (id: string) => [...shipmentKeys.all, id, "containers"] as const,
  documents: (id: string) => [...shipmentKeys.all, id, "documents"] as const,
  tracking: (id: string) => [...shipmentKeys.all, id, "tracking"] as const,
};
