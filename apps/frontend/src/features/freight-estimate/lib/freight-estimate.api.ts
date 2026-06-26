import { api } from "@/lib/api";
import type {
  FreightEstimateDto,
  FreightEstimatePanelDto,
  FreightEstimateStatusDto,
} from "@dmx/contracts/freight-estimate";
import type { CreateFreightEstimatePayload } from "@dmx/contracts/freight-estimate.zod";

export const freightEstimateApi = {
  list: (params?: { tradeId?: string; status?: string; limit?: number }) =>
    api.get<(FreightEstimateDto | FreightEstimateStatusDto)[]>("/freight-estimates", { params })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<FreightEstimateDto | FreightEstimateStatusDto>(`/freight-estimates/${id}`)
      .then((r) => r.data),

  panel: (tradeId: string) =>
    api.get<FreightEstimatePanelDto>("/freight-estimates/panel", { params: { tradeId } })
      .then((r) => r.data),

  create: (payload: CreateFreightEstimatePayload) =>
    api.post<FreightEstimateDto>("/freight-estimates", payload).then((r) => r.data),

  refresh: (id: string) =>
    api.post<FreightEstimateDto>(`/freight-estimates/${id}/refresh`).then((r) => r.data),

  kpiEstimatedCifReady: () =>
    api.get<{ estimatedCifReady: number }>("/freight-estimates/kpi/estimated-cif-ready")
      .then((r) => r.data),
};
