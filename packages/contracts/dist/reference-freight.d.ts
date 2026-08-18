export declare const ReferenceFreightRateStatus: readonly ["ACTIVE", "INACTIVE"];
export type ReferenceFreightRateStatus = (typeof ReferenceFreightRateStatus)[number];
export declare const ReferenceFreightLifecycleStatus: readonly ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "INACTIVE"];
export type ReferenceFreightLifecycleStatus = (typeof ReferenceFreightLifecycleStatus)[number];
export declare const ReferenceFreightAuditAction: readonly ["CREATED", "UPDATED", "DEACTIVATED", "IMPORTED", "COPIED_MONTH"];
export type ReferenceFreightAuditAction = (typeof ReferenceFreightAuditAction)[number];
/** Roles allowed to manage reference freight rates. */
export declare const REFERENCE_FREIGHT_ADMIN_ROLES: readonly ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"];
export interface ReferenceFreightRateDto {
    id: string;
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    currency: string;
    validFrom: string;
    validUntil: string;
    status: ReferenceFreightRateStatus;
    lifecycleStatus: ReferenceFreightLifecycleStatus;
    createdById: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ReferenceFreightRateListPage {
    items: ReferenceFreightRateDto[];
    total: number;
    page: number;
    pageSize: number;
}
export interface ReferenceFreightRateAuditDto {
    id: string;
    rateId: string | null;
    action: ReferenceFreightAuditAction;
    actorUserId: string | null;
    snapshot: Record<string, unknown>;
    createdAt: string;
}
export interface ReferenceFreightImportResultDto {
    created: number;
    skipped: number;
    errors: Array<{
        row: number;
        message: string;
    }>;
}
export interface ReferenceFreightCopyMonthResultDto {
    copied: number;
    skipped: number;
    targetMonth: string;
}
export interface ReferenceFreightLookupDto {
    status: "FOUND" | "MISSING";
    originPort: string;
    destinationPort: string;
    containerType: string;
    rate: ReferenceFreightRateDto | null;
    message: string | null;
}
export declare const REFERENCE_FREIGHT_MISSING_MESSAGE_TR = "Bu rota i\u00E7in referans navlun verisi bulunmamaktad\u0131r. L\u00FCtfen FreightIQ ile canl\u0131 navlun teklifi al\u0131n.";
export declare const REFERENCE_FREIGHT_DISCLAIMER_TR = "Bu navlun tutar\u0131 DeMaxtore'un ayl\u0131k referans navlun verilerine g\u00F6re hesaplanm\u0131\u015Ft\u0131r. Nihai navlun fiyat\u0131 FreightIQ s\u00FCrecinde kesinle\u015Fecektir.";
export declare const EXPIRING_SOON_DAYS = 7;
export declare function computeReferenceFreightLifecycleStatus(status: ReferenceFreightRateStatus, validFrom: string | Date, validUntil: string | Date, now?: Date): ReferenceFreightLifecycleStatus;
