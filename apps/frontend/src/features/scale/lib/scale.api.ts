import { api } from "@/lib/api";
import type {
  BuyerHealth,
  SupplierHealth,
  AccountOwner,
  PipelineHealthSummary,
  CommercialForecast,
  OperatorWorkload,
  ExecutiveDashboard,
} from "@dmx/contracts/scale-readiness";

export const scaleApi = {
  listBuyers: () => api.get<BuyerHealth[]>("/scale/portfolio/buyers").then((r) => r.data),
  listSuppliers: () => api.get<SupplierHealth[]>("/scale/portfolio/suppliers").then((r) => r.data),
  assignAccount: (organisationId: string, body: Record<string, unknown>) =>
    api.post<AccountOwner>(`/scale/accounts/${organisationId}/assign`, body).then((r) => r.data),
  pipelineHealth: () => api.get<PipelineHealthSummary>("/scale/pipeline/health").then((r) => r.data),
  forecast: (days: 30 | 60 | 90) =>
    api.get<CommercialForecast>("/scale/forecast", { params: { days } }).then((r) => r.data),
  workload: () => api.get<OperatorWorkload[]>("/scale/workload").then((r) => r.data),
  executive: () => api.get<ExecutiveDashboard>("/scale/executive").then((r) => r.data),
};
