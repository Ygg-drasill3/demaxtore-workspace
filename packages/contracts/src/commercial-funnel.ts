// Sprint 7B — Growth engine & commercial funnel intelligence

export interface FunnelStageMetrics {
  stage: string;
  label: string;
  count: number;
  conversionPercent: number;
  dropoffPercent: number;
  averageTimeHours: number | null;
}

export interface CommercialFunnel {
  stages: FunnelStageMetrics[];
  totalRfqs: number;
  overallConversionPercent: number;
}

export interface ConversionMetrics {
  rfqToPoPercent: number;
  poToOrderPercent: number;
  orderToShipmentPercent: number;
  shipmentCompletePercent: number;
  quoteToSelectPercent: number;
  assignToQuotePercent: number;
}

export interface DropoffMetrics {
  stage: string;
  label: string;
  dropoffCount: number;
  dropoffPercent: number;
  primaryReason: string | null;
}

export interface ActivationMetrics {
  cold: number;
  warm: number;
  active: number;
  powerBuyer: number;
  totalBuyers: number;
}

export interface BuyerActivation {
  organisationId: string;
  organisationName: string;
  buyerUserIds: string[];
  rfqsCreated: number;
  rfqsSubmitted: number;
  ordersCreated: number;
  shipmentsCompleted: number;
  daysSinceActivity: number;
  communicationCount: number;
  activationScore: number;
  classification: "Cold" | "Warm" | "Active" | "Power Buyer";
}

export interface SupplierPerformance {
  organisationId: string;
  organisationName: string;
  supplierUserIds: string[];
  invitationsReceived: number;
  quotationsSubmitted: number;
  selectionRate: number;
  winRate: number;
  revenueGeneratedUsd: number;
  shipmentVolume: number;
  freightiqRevenueUsd: number;
  growthScore: number;
  classification: "Inactive" | "Emerging" | "Active" | "Top Performer";
}

export interface CategoryIntelligence {
  category: string;
  rfqCount: number;
  orderCount: number;
  shipmentCount: number;
  revenueUsd: number;
  freightiqRevenueUsd: number;
}

export interface RouteGrowthIntelligence {
  route: string;
  lane: string;
  rfqCount: number;
  orderCount: number;
  shipmentCount: number;
  revenueUsd: number;
  freightiqRevenueUsd: number;
}

export interface RepeatCustomerMetrics {
  horizonDays: 30 | 90 | 365;
  firstTimeBuyers: number;
  repeatBuyers: number;
  repeatRate: number;
  repeatShipmentRate: number;
  repeatRevenueUsd: number;
}

export interface LostOpportunityItem {
  type: string;
  workspaceId: string;
  workspaceRef: string;
  description: string;
  estimatedLostRevenueUsd: number;
  estimatedLostFreightiqRevenueUsd: number;
}

export interface LostOpportunityReport {
  items: LostOpportunityItem[];
  totalEstimatedLostRevenueUsd: number;
  totalEstimatedLostFreightiqRevenueUsd: number;
}

export interface GrowthTrendPoint {
  period: string;
  rfqsCreated: number;
  posIssued: number;
  ordersCreated: number;
  shipmentsCompleted: number;
  freightiqRevenueUsd: number;
}

export interface GrowthInsight {
  funnel: CommercialFunnel;
  conversion: ConversionMetrics;
  dropoffs: DropoffMetrics[];
  buyerActivation: BuyerActivation[];
  activationSummary: ActivationMetrics;
  supplierPerformance: SupplierPerformance[];
  categories: CategoryIntelligence[];
  routes: RouteGrowthIntelligence[];
  repeatCustomers: RepeatCustomerMetrics[];
  lostOpportunities: LostOpportunityReport;
  trends: GrowthTrendPoint[];
  generatedAt: string;
}
