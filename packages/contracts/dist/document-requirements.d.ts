import type { TradeDocumentType } from "./trade-documents";
export interface RequirementRule {
    documentType: TradeDocumentType;
    required: boolean;
}
/** Default requirements for export shipment documentation. */
export declare const EXPORT_SHIPMENT_REQUIREMENTS: RequirementRule[];
export declare function getDefaultRequirements(_workspaceType: "ORDER" | "SHIPMENT"): RequirementRule[];
