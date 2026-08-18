import type { SupplierSearchItem } from "@dmx/contracts/purchase-order.zod";
import type { PoNumberMode } from "@dmx/contracts/purchase-order.zod";

export const WIZARD_STEPS = [
  { key: "supplier", title: "Supplier" },
  { key: "products", title: "Products" },
  { key: "commercial", title: "Commercial Terms" },
  { key: "documents", title: "Documents" },
  { key: "review", title: "Review" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];

export interface DirectPoLineDraft {
  clientId: string;
  productName: string;
  productCode: string;
  description: string;
  specification: string;
  packaging: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  /** Sprint 36B — selected Product Master id */
  productId: string;
  /** When true, submit quickCreateProduct from productCode/name/unit/origin fields */
  quickCreate: boolean;
  countryOfOrigin: string;
  supplierSku: string;
}

export interface DirectPoDocumentDraft {
  file: File | null;
  documentUrl: string | null;
  documentFileName: string | null;
}

export interface DirectPoWizardState {
  supplier: SupplierSearchItem | null;
  poNumberMode: PoNumberMode;
  poNumber: string;
  currency: string;
  incoterm: string;
  paymentTerms: string;
  deliveryTerms: string;
  expectedDeliveryDate: string;
  destinationCountry: string;
  destinationPort: string;
  buyerReference: string;
  notes: string;
  document: DirectPoDocumentDraft;
  lines: DirectPoLineDraft[];
}

export function createEmptyLine(): DirectPoLineDraft {
  return {
    clientId: crypto.randomUUID(),
    productName: "",
    productCode: "",
    description: "",
    specification: "",
    packaging: "",
    quantity: "",
    unit: "piece",
    unitPrice: "",
    productId: "",
    quickCreate: false,
    countryOfOrigin: "",
    supplierSku: "",
  };
}

export function createInitialWizardState(currency = "USD"): DirectPoWizardState {
  return {
    supplier: null,
    poNumberMode: "AUTO",
    poNumber: "",
    currency,
    incoterm: "FOB",
    paymentTerms: "",
    deliveryTerms: "",
    expectedDeliveryDate: "",
    destinationCountry: "",
    destinationPort: "",
    buyerReference: "",
    notes: "",
    document: { file: null, documentUrl: null, documentFileName: null },
    lines: [createEmptyLine()],
  };
}
