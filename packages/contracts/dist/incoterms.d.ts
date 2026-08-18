export declare const SUPPORTED_INCOTERMS: readonly ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"];
export type IncotermCode = (typeof SUPPORTED_INCOTERMS)[number];
export type ResponsibilityParty = "SELLER" | "BUYER";
export interface IncotermProfile {
    code: IncotermCode;
    riskTransferShipmentState: string;
    freightResponsibility: ResponsibilityParty;
    insuranceResponsibility: ResponsibilityParty;
    customsExportResponsibility: ResponsibilityParty;
    customsImportResponsibility: ResponsibilityParty;
    requiredDocuments: string[];
    balancePaymentBeforeDelivery: boolean;
}
export declare const INCOTERM_PROFILES: Record<IncotermCode, IncotermProfile>;
export declare function resolveIncotermProfile(code: string | null | undefined): IncotermProfile;
