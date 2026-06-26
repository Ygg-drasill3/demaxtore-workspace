// Faz 5 — Incoterms rules engine (contracts)
export const SUPPORTED_INCOTERMS = ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"] as const;
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

export const INCOTERM_PROFILES: Record<IncotermCode, IncotermProfile> = {
  EXW: {
    code: "EXW",
    riskTransferShipmentState: "READY_FOR_PICKUP",
    freightResponsibility: "BUYER",
    insuranceResponsibility: "BUYER",
    customsExportResponsibility: "BUYER",
    customsImportResponsibility: "BUYER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "PACKING_LIST"],
    balancePaymentBeforeDelivery: true,
  },
  FOB: {
    code: "FOB",
    riskTransferShipmentState: "LOADED_ON_VESSEL",
    freightResponsibility: "BUYER",
    insuranceResponsibility: "BUYER",
    customsExportResponsibility: "SELLER",
    customsImportResponsibility: "BUYER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"],
    balancePaymentBeforeDelivery: true,
  },
  CFR: {
    code: "CFR",
    riskTransferShipmentState: "LOADED_ON_VESSEL",
    freightResponsibility: "SELLER",
    insuranceResponsibility: "BUYER",
    customsExportResponsibility: "SELLER",
    customsImportResponsibility: "BUYER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "BILL_OF_LADING"],
    balancePaymentBeforeDelivery: true,
  },
  CIF: {
    code: "CIF",
    riskTransferShipmentState: "LOADED_ON_VESSEL",
    freightResponsibility: "SELLER",
    insuranceResponsibility: "SELLER",
    customsExportResponsibility: "SELLER",
    customsImportResponsibility: "BUYER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "BILL_OF_LADING", "INSURANCE_CERTIFICATE"],
    balancePaymentBeforeDelivery: true,
  },
  DAP: {
    code: "DAP",
    riskTransferShipmentState: "READY_FOR_DELIVERY",
    freightResponsibility: "SELLER",
    insuranceResponsibility: "SELLER",
    customsExportResponsibility: "SELLER",
    customsImportResponsibility: "BUYER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "BILL_OF_LADING"],
    balancePaymentBeforeDelivery: false,
  },
  DDP: {
    code: "DDP",
    riskTransferShipmentState: "DELIVERED",
    freightResponsibility: "SELLER",
    insuranceResponsibility: "SELLER",
    customsExportResponsibility: "SELLER",
    customsImportResponsibility: "SELLER",
    requiredDocuments: ["COMMERCIAL_INVOICE", "BILL_OF_LADING", "CUSTOMS_DECLARATION"],
    balancePaymentBeforeDelivery: false,
  },
};

export function resolveIncotermProfile(code: string | null | undefined): IncotermProfile {
  const upper = (code ?? "FOB").toUpperCase() as IncotermCode;
  return INCOTERM_PROFILES[upper] ?? INCOTERM_PROFILES.FOB;
}
