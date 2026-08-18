import { api } from "@/lib/api";
import type { LandedCostCalculationDto } from "@dmx/contracts/landed-cost";

export const landedCostApi = {
  list: () => api.get<{ items: LandedCostCalculationDto[] }>("/landed-cost").then((r) => r.data),

  get: (id: string) => api.get<LandedCostCalculationDto>(`/landed-cost/${id}`).then((r) => r.data),

  byShipment: (shipmentWorkspaceId: string) =>
    api
      .get<LandedCostCalculationDto | null>(`/landed-cost/by-shipment/${shipmentWorkspaceId}`)
      .then((r) => r.data),

  versions: (shipmentWorkspaceId: string) =>
    api
      .get<{ items: LandedCostCalculationDto[] }>(
        `/landed-cost/by-shipment/${shipmentWorkspaceId}/versions`,
      )
      .then((r) => r.data),

  calculate: (body: {
    shipmentWorkspaceId: string;
    calculationCurrency?: string;
    exchangeRate?: number | null;
    fxRates?: Record<string, number> | null;
  }) => api.post<LandedCostCalculationDto>("/landed-cost/calculate", body).then((r) => r.data),

  addTransactionCost: (body: {
    shipmentWorkspaceId: string;
    componentType: string;
    amount: number;
    currency: string;
    costNature?: string;
    sourceType?: string;
    description: string;
  }) => api.post("/landed-cost/transaction-costs", body).then((r) => r.data),
};
