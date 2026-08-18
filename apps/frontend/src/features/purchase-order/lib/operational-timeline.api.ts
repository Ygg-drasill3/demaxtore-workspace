import { api } from "@/lib/api";
import type { OperationalTimelineListResponse } from "@dmx/contracts/operational-timeline";
import type { OperationalTimelineListQuery } from "@dmx/contracts/operational-timeline.zod";

export const operationalTimelineApi = {
  list: (purchaseOrderId: string, query: Partial<OperationalTimelineListQuery> = {}) =>
    api
      .get<OperationalTimelineListResponse>(`/purchase-orders/${purchaseOrderId}/timeline`, {
        params: query,
      })
      .then((r) => r.data),
};
