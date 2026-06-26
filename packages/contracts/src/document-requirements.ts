// Sprint 5C — default export documentation requirements (configurable rules)
import type { TradeDocumentType } from "./trade-documents";

export interface RequirementRule {
  documentType: TradeDocumentType;
  required: boolean;
}

/** Default requirements for export shipment documentation. */
export const EXPORT_SHIPMENT_REQUIREMENTS: RequirementRule[] = [
  { documentType: "COMMERCIAL_INVOICE", required: true },
  { documentType: "PACKING_LIST", required: true },
  { documentType: "BILL_OF_LADING", required: true },
  { documentType: "CERTIFICATE_OF_ORIGIN", required: false },
  { documentType: "HEALTH_CERTIFICATE", required: false },
  { documentType: "INSURANCE_CERTIFICATE", required: false },
  { documentType: "INSPECTION_REPORT", required: false },
  { documentType: "EXPORT_DECLARATION", required: false },
];

export function getDefaultRequirements(_workspaceType: "ORDER" | "SHIPMENT"): RequirementRule[] {
  return EXPORT_SHIPMENT_REQUIREMENTS;
}
