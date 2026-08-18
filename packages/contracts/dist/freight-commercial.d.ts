export declare const FreightLedgerStatus: readonly ["PENDING", "REALIZED", "CANCELLED"];
export type FreightLedgerStatus = (typeof FreightLedgerStatus)[number];
/** Per-offer commercial fields (admin-only in API responses). */
export interface FreightMargin {
    internalCostUsd: number;
    freightiqMarginUsd: number;
    displayPriceUsd: number;
    marginLockedAt: string | null;
    marginLockedBy: string | null;
}
export interface FreightCommercialSummary {
    orderId: string;
    currency: string;
    /** Factory / order goods value (FOB proxy from order total). */
    fobValueUsd: number;
    /** Selected or lowest comparable display freight (USD). */
    displayFreightUsd: number | null;
    estimatedCifUsd: number | null;
}
export interface FreightRevenueLedgerEntry {
    id: string;
    shipmentId: string | null;
    orderId: string;
    freightOfferId: string;
    forwarderCostUsd: number;
    freightiqMarginUsd: number;
    displayPriceUsd: number;
    currency: string;
    status: FreightLedgerStatus;
    realizedAt: string | null;
    createdAt: string;
}
export interface FreightProfitability {
    offerId: string;
    displayPriceUsd: number;
    internalCostUsd: number;
    freightiqMarginUsd: number;
    marginPercent: number;
}
export interface FreightCommercialMetrics {
    freightVolume: number;
    selectedFreightOffers: number;
    revenuePendingUsd: number;
    revenueRealizedUsd: number;
    averageMarginUsd: number;
    topRoutes: Array<{
        route: string;
        count: number;
        marginUsd: number;
    }>;
    topForwarders: Array<{
        forwarder: string;
        count: number;
        marginUsd: number;
    }>;
}
export interface FreightCommercialReport {
    metrics: FreightCommercialMetrics;
    pendingRevenue: FreightRevenueLedgerEntry[];
    realizedRevenue: FreightRevenueLedgerEntry[];
    revenueByMonth: Array<{
        month: string;
        realizedUsd: number;
        pendingUsd: number;
    }>;
    revenueByRoute: Array<{
        route: string;
        realizedUsd: number;
        pendingUsd: number;
    }>;
    revenueByForwarder: Array<{
        forwarder: string;
        realizedUsd: number;
        pendingUsd: number;
    }>;
    marginPerContainer: Array<{
        shipmentId: string;
        orderRef: string;
        marginUsd: number;
    }>;
    topShipments: Array<{
        shipmentId: string;
        orderId: string;
        marginUsd: number;
        status: FreightLedgerStatus;
    }>;
}
