// Sprint 7C — Market intelligence & opportunity engine (rule-based, no AI)

export interface OpportunityScore {
  score: number;
  label: "low" | "medium" | "high" | "critical";
  factors: string[];
}

export interface MarketTrend {
  period: string;
  rfqCount: number;
  orderCount: number;
  shipmentCount: number;
  revenueUsd: number;
  freightiqRevenueUsd: number;
  growthPercent: number;
}

export interface DemandHotspot {
  country: string;
  demandScore: number;
  rfqCount: number;
  orderCount: number;
  shipmentCount: number;
  revenueUsd: number;
  freightiqRevenueUsd: number;
  growthPercent: number;
}

export interface SupplyGap {
  category: string;
  country: string | null;
  demandLevel: "high" | "medium" | "low";
  supplierParticipation: number;
  quotationCount: number;
  conversionRate: number;
  opportunityScore: number;
  recruitmentPriority: string;
}

export interface CategoryOpportunity {
  category: string;
  rfqVolume: number;
  quotationVolume: number;
  orderVolume: number;
  shipmentVolume: number;
  revenueUsd: number;
  freightiqRevenueUsd: number;
  conversionRate: number;
  growthPercent: number;
  trend: "growing" | "declining" | "stable";
  opportunityScore: number;
}

export interface RouteOpportunity {
  route: string;
  lane: string;
  revenueUsd: number;
  marginUsd: number;
  shipmentCount: number;
  buyerDemand: number;
  growthPercent: number;
  opportunityScore: number;
}

export interface BuyerOpportunity {
  organisationId: string;
  organisationName: string;
  category: string | null;
  country: string | null;
  rfqCount: number;
  quotationCount: number;
  issue: string;
  potentialRevenueUsd: number;
  potentialFreightiqRevenueUsd: number;
  potentialShipments: number;
  opportunityScore: number;
}

export interface ForwarderOpportunity {
  forwarderId: string | null;
  forwarderName: string;
  offerVolume: number;
  selectionRate: number;
  routeCoverage: number;
  revenueContributionUsd: number;
  winRate: number;
  growthScore: number;
  classification: "Underutilized" | "Emerging" | "Core Partner" | "Strategic Partner";
}

export interface GrowthRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
  entityType: "category" | "route" | "country" | "supplier" | "buyer" | "forwarder";
  entityRef: string;
}

export interface MarketInsight {
  trends: MarketTrend[];
  demandHotspots: DemandHotspot[];
  supplyGaps: SupplyGap[];
  categoryOpportunities: CategoryOpportunity[];
  routeOpportunities: RouteOpportunity[];
  buyerOpportunities: BuyerOpportunity[];
  forwarderOpportunities: ForwarderOpportunity[];
  recommendations: GrowthRecommendation[];
  topOpportunities: Array<{
    type: string;
    ref: string;
    score: number;
    summary: string;
  }>;
  generatedAt: string;
}
