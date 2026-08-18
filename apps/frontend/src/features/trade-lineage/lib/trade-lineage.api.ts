import { api } from "@/lib/api";
import type { RelatedEntitiesDto } from "@dmx/contracts/trade-lineage";

export const tradeLineageApi = {
  forPurchaseOrder: (poId: string) =>
    api.get<RelatedEntitiesDto>(`/purchase-orders/${poId}/related-entities`).then((r) => r.data),
  forShipment: (shipmentId: string) =>
    api.get<RelatedEntitiesDto>(`/shipments/${shipmentId}/related-entities`).then((r) => r.data),
  forContainer: (shipmentId: string, containerId: string) =>
    api
      .get<RelatedEntitiesDto>(`/shipments/${shipmentId}/containers/${containerId}/related-entities`)
      .then((r) => r.data),
  upsertAllocation: (body: {
    purchaseOrderLineId: string;
    shipmentWorkspaceId: string;
    shipmentContainerId?: string | null;
    quantity: number;
    unit?: string | null;
  }) => api.post<{ id: string }>("/shipments/line-allocations", body).then((r) => r.data),
};
