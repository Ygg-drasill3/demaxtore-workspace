import type { TradeTimelinePayload } from "@dmx/contracts/trade-timeline";
import { api } from "@/lib/api";

export const tradeTimelineApi = {
  get: (tradeId: string) =>
    api.get<TradeTimelinePayload>(`/trade-timeline/${tradeId}`).then((r) => r.data),

  kpiSummary: () =>
    api.get<import("@dmx/contracts/trade-timeline").TradeTimelineKpiDto>("/trade-timeline/kpi/summary").then((r) => r.data),
};
