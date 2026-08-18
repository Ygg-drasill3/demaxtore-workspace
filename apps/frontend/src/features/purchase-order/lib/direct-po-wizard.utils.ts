import { ZodError } from "zod";
import {
  CreateDirectPurchaseOrderPublicSchema,
  DirectPurchaseOrderLineSchema,
} from "@dmx/contracts/purchase-order.zod";
import type { CreateDirectPurchaseOrderPublicInput } from "@dmx/contracts/purchase-order.zod";
import type { DirectPoLineDraft, DirectPoWizardState } from "./direct-po-wizard.types";

export interface FieldErrors {
  [key: string]: string | undefined;
}

export interface StepValidationResult {
  ok: boolean;
  errors: FieldErrors;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function lineToPayload(line: DirectPoLineDraft) {
  const quantity = Number(line.quantity);
  const unitPriceRaw = line.unitPrice.trim();
  const unitPrice = unitPriceRaw === "" ? null : Number(unitPriceRaw);
  // No product-name field in UI — derive from code, then description.
  const productName =
    line.productCode.trim() || line.description.trim() || line.productName.trim();

  const payload: Record<string, unknown> = {
    productName,
    productCode: emptyToNull(line.productCode),
    description: emptyToNull(line.description),
    specification: emptyToNull(line.specification),
    packaging: emptyToNull(line.packaging),
    quantity,
    unit: line.unit.trim(),
    unitPrice,
  };
  if (line.productId.trim()) {
    payload.productId = line.productId.trim();
  } else if (line.quickCreate && line.productCode.trim()) {
    payload.quickCreateProduct = {
      sku: line.productCode.trim(),
      name: productName || line.productCode.trim(),
      unitOfMeasure: line.unit.trim() || "PCS",
      countryOfOrigin: emptyToNull(line.countryOfOrigin),
      supplierSku: emptyToNull(line.supplierSku),
      description: emptyToNull(line.description),
    };
  }
  return payload;
}

export function buildSubmitPayload(state: DirectPoWizardState): CreateDirectPurchaseOrderPublicInput {
  const body = {
    supplierId: state.supplier!.id,
    poNumberMode: state.poNumberMode,
    poNumber: state.poNumberMode === "CUSTOM" ? emptyToNull(state.poNumber) : null,
    currency: state.currency.trim().toUpperCase(),
    incoterm: emptyToNull(state.incoterm),
    paymentTerms: emptyToNull(state.paymentTerms),
    deliveryTerms: emptyToNull(state.deliveryTerms),
    expectedDeliveryDate: emptyToNull(state.expectedDeliveryDate),
    destinationCountryCode: emptyToNull(state.destinationCountry),
    destinationPort: emptyToNull(state.destinationPort),
    buyerReference: emptyToNull(state.buyerReference),
    notes: emptyToNull(state.notes),
    documentUrl: state.document.documentUrl,
    documentFileName: state.document.documentFileName,
    lines: state.lines.map(lineToPayload),
  };
  return CreateDirectPurchaseOrderPublicSchema.parse(body);
}

export function validateSupplierStep(state: DirectPoWizardState): StepValidationResult {
  if (!state.supplier?.id) {
    return { ok: false, errors: { supplier: "Select a supplier to continue." } };
  }
  return { ok: true, errors: {} };
}

export function validateProductsStep(state: DirectPoWizardState): StepValidationResult {
  const errors: FieldErrors = {};
  if (state.lines.length < 1) {
    errors.lines = "Add at least one product line.";
  }
  if (state.lines.length > 200) {
    errors.lines = "Maximum 200 product lines allowed.";
  }

  state.lines.forEach((line, index) => {
    const parsed = DirectPurchaseOrderLineSchema.safeParse(lineToPayload(line));
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        errors[`lines.${index}.${String(field)}`] = issue.message;
      });
    }
  });

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCommercialStep(state: DirectPoWizardState): StepValidationResult {
  const errors: FieldErrors = {};
  const currency = state.currency.trim();
  if (currency.length !== 3) {
    errors.currency = "Currency must be a 3-letter code.";
  }
  if (state.poNumberMode === "CUSTOM" && !state.poNumber.trim()) {
    errors.poNumber = "PO number is required when using custom numbering.";
  }
  if (state.destinationCountry.trim().length > 100) {
    errors.destinationCountry = "Destination country must be 100 characters or fewer.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateDocumentsStep(_state: DirectPoWizardState): StepValidationResult {
  return { ok: true, errors: {} };
}

export function validateStep(stepIndex: number, state: DirectPoWizardState): StepValidationResult {
  switch (stepIndex) {
    case 0:
      return validateSupplierStep(state);
    case 1:
      return validateProductsStep(state);
    case 2:
      return validateCommercialStep(state);
    case 3:
      return validateDocumentsStep(state);
    default:
      return { ok: true, errors: {} };
  }
}

export function validateFullWizard(state: DirectPoWizardState): StepValidationResult {
  try {
    buildSubmitPayload(state);
    return { ok: true, errors: {} };
  } catch (err) {
    const errors: FieldErrors = {};
    if (err instanceof ZodError) {
      err.issues.forEach((issue) => {
        errors[issue.path.join(".")] = issue.message;
      });
    } else {
      errors.form = "Please review all required fields.";
    }
    return { ok: false, errors };
  }
}

export interface LineTotals {
  lineTotal: number | null;
  hasAllPrices: boolean;
}

export function computeLineTotal(line: DirectPoLineDraft): LineTotals {
  const qty = Number(line.quantity);
  const priceRaw = line.unitPrice.trim();
  if (!Number.isFinite(qty) || qty <= 0 || priceRaw === "") {
    return { lineTotal: null, hasAllPrices: false };
  }
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { lineTotal: null, hasAllPrices: false };
  }
  return { lineTotal: qty * price, hasAllPrices: true };
}

export function computeSubtotal(lines: DirectPoLineDraft[]): {
  subtotal: number | null;
  allPriced: boolean;
} {
  let sum = 0;
  let allPriced = true;
  for (const line of lines) {
    const { lineTotal, hasAllPrices } = computeLineTotal(line);
    if (!hasAllPrices) {
      allPriced = false;
      break;
    }
    sum += lineTotal ?? 0;
  }
  return { subtotal: allPriced ? sum : null, allPriced };
}

export function wizardHasMeaningfulData(state: DirectPoWizardState): boolean {
  if (state.supplier) return true;
  if (state.poNumberMode === "CUSTOM" && state.poNumber.trim()) return true;
  if (state.paymentTerms.trim() || state.deliveryTerms.trim()) return true;
  if (state.incoterm.trim() && state.incoterm !== "FOB") return true;
  if (state.expectedDeliveryDate || state.destinationCountry.trim() || state.destinationPort.trim()) return true;
  if (state.buyerReference.trim() || state.notes.trim()) return true;
  if (state.document.file || state.document.documentUrl) return true;
  return state.lines.some(
    (l) =>
      l.productName.trim() ||
      l.productCode.trim() ||
      l.description.trim() ||
      l.quantity.trim() ||
      l.unitPrice.trim(),
  );
}

export function getApiErrorCode(err: unknown): string | undefined {
  const ax = err as { response?: { data?: { error?: { code?: string } } } };
  return ax.response?.data?.error?.code;
}
