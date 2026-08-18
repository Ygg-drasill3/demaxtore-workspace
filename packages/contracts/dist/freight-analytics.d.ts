export interface RouteProfitability {
    route: string;
    lane: string;
    countryFrom: string;
    countryTo: string;
    shipmentCount: number;
    revenueUsd: number;
    marginUsd: number;
    averageMarginUsd: number;
    revenuePerContainer: number;
}
export interface ForwarderProfitability {
    forwarderId: string | null;
    forwarderName: string;
    offerCount: number;
    selectionCount: number;
    winRate: number;
    revenueGeneratedUsd: number;
    averageMarginUsd: number;
    averageTransitDays: number;
    averageEtaDriftDays: number;
    delayRate: number;
}
export interface MarginPolicy {
    id: string;
    name: string;
    routePattern: string | null;
    countryFrom: string | null;
    countryTo: string | null;
    defaultMarginUsd: number;
    minMarginUsd: number;
    maxMarginUsd: number;
    isActive: boolean;
    createdAt: string;
}
export interface RevenueTrend {
    period: string;
    revenueUsd: number;
    marginUsd: number;
    pendingUsd: number;
    containerCount: number;
}
export interface LanePerformance {
    lane: string;
    route: string;
    rank: number;
    revenueUsd: number;
    marginUsd: number;
    performance: "top" | "bottom" | "neutral";
}
export interface MarginDistributionBucket {
    label: string;
    count: number;
    marginUsd: number;
}
export interface FreightCommercialInsight {
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingRevenue: number;
    realizedRevenue: number;
    averageMargin: number;
    revenuePerContainer: number;
    topRoutes: RouteProfitability[];
    bottomRoutes: RouteProfitability[];
    topForwarders: ForwarderProfitability[];
    marginDistribution: MarginDistributionBucket[];
    revenueByRoute: RouteProfitability[];
    revenueByForwarder: Array<{
        forwarder: string;
        revenueUsd: number;
        marginUsd: number;
    }>;
    revenueByCountry: Array<{
        country: string;
        revenueUsd: number;
        marginUsd: number;
    }>;
    revenueByMonth: RevenueTrend[];
    marginByRoute: RouteProfitability[];
    marginByForwarder: Array<{
        forwarder: string;
        marginUsd: number;
        count: number;
    }>;
    containerCountByRoute: Array<{
        route: string;
        count: number;
    }>;
    forwarderScorecards: ForwarderProfitability[];
    suggestedMarginPreview?: {
        lane: string;
        suggestedMarginUsd: number;
        policyName: string | null;
    };
}
export interface MarginPolicySuggestion {
    pol: string;
    pod: string;
    lane: string;
    route: string;
    countryFrom: string;
    countryTo: string;
    suggestedMarginUsd: number;
    minMarginUsd: number;
    maxMarginUsd: number;
    policyId: string | null;
    policyName: string | null;
}
