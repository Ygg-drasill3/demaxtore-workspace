import { api } from "@/lib/api";
import type {
  CommercialFunnel,
  ConversionMetrics,
  DropoffMetrics,
  GrowthInsight,
  BuyerActivation,
  SupplierPerformance,
  CategoryIntelligence,
  RouteGrowthIntelligence,
  RepeatCustomerMetrics,
  LostOpportunityReport,
} from "@dmx/contracts/commercial-funnel";
import type { ProcurementStrategyReport } from "@dmx/contracts/procurement-strategy";

export const growthApi = {
  funnel: () => api.get<CommercialFunnel>("/growth/funnel").then((r) => r.data),
  conversion: () => api.get<ConversionMetrics>("/growth/conversion").then((r) => r.data),
  dropoffs: () => api.get<DropoffMetrics[]>("/growth/dropoffs").then((r) => r.data),
  insights: () => api.get<GrowthInsight>("/growth/insights").then((r) => r.data),
  buyerActivation: () => api.get<BuyerActivation[]>("/growth/buyers/activation").then((r) => r.data),
  supplierPerformance: () =>
    api.get<SupplierPerformance[]>("/growth/suppliers/performance").then((r) => r.data),
  categories: () => api.get<CategoryIntelligence[]>("/growth/categories").then((r) => r.data),
  routes: () => api.get<RouteGrowthIntelligence[]>("/growth/routes").then((r) => r.data),
  repeatCustomers: () =>
    api.get<RepeatCustomerMetrics[]>("/growth/repeat-customers").then((r) => r.data),
  lostOpportunities: () =>
    api.get<LostOpportunityReport>("/growth/lost-opportunities").then((r) => r.data),
  procurementStrategy: () =>
    api.get<ProcurementStrategyReport>("/growth/procurement-strategy").then((r) => r.data),
};
