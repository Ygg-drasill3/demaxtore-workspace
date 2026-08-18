export declare const FreightEstimateStatus: readonly ["ACTIVE", "EXPIRED", "SUPERSEDED"];
export type FreightEstimateStatus = (typeof FreightEstimateStatus)[number];
export declare const FREIGHT_ESTIMATE_TIMELINE_EVENTS: {
    readonly CREATED: "freight_estimate.created";
    readonly UPDATED: "freight_estimate.updated";
    readonly EXPIRED: "freight_estimate.expired";
    readonly ACCEPTED: "freight_estimate.accepted";
};
export interface FreightEstimateDto {
    id: string;
    tradeId: string;
    supplierId: string;
    originCountry: string;
    originPort: string;
    destinationCountry: string;
    destinationPort: string;
    containerType: string;
    fobValue: number;
    estimatedFreight: number;
    currency: string;
    estimatedCifValue: number;
    estimatedAt: string;
    expiresAt: string;
    status: FreightEstimateStatus;
    lastRefreshedAt: string | null;
    referenceFreightRateId: string | null;
}
/** Supplier-facing view — status only (no freight/CIF amounts). */
export interface FreightEstimateStatusDto {
    id: string;
    tradeId: string;
    status: FreightEstimateStatus;
    expiresAt: string;
    estimatedAt: string;
}
export interface FreightEstimatePanelDto {
    current: FreightEstimateDto | null;
    history: FreightEstimateDto[];
    expirationStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE";
    lastRefresh: string | null;
    referenceFreight: {
        status: "APPLIED" | "MISSING" | "UNKNOWN";
        originPort: string | null;
        destinationPort: string | null;
        containerType: string | null;
        validFrom: string | null;
        validUntil: string | null;
        message: string | null;
    };
}
export interface FreightEstimateListQuery {
    tradeId?: string;
    status?: FreightEstimateStatus;
    limit?: number;
}
