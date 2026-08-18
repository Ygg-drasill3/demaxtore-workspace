import { describe, expect, it } from "vitest";
import {
  buildSubmitPayload,
  computeSubtotal,
  validateProductsStep,
  validateSupplierStep,
  wizardHasMeaningfulData,
} from "./direct-po-wizard.utils";
import { createEmptyLine, createInitialWizardState } from "./direct-po-wizard.types";

describe("direct-po-wizard.utils", () => {
  it("requires supplier on step 1", () => {
    const state = createInitialWizardState();
    expect(validateSupplierStep(state).ok).toBe(false);
  });

  it("validates product lines", () => {
    const state = createInitialWizardState();
    state.lines = [{ ...createEmptyLine(), productName: "Sunflower oil", quantity: "10", unit: "ton" }];
    expect(validateProductsStep(state).ok).toBe(true);
  });

  it("shows not specified subtotal when prices omitted", () => {
    const state = createInitialWizardState();
    state.lines = [{ ...createEmptyLine(), productName: "Oil", quantity: "10", unit: "ton", unitPrice: "" }];
    const { subtotal, allPriced } = computeSubtotal(state.lines);
    expect(allPriced).toBe(false);
    expect(subtotal).toBeNull();
  });

  it("builds payload without clientId", () => {
    const state = createInitialWizardState();
    state.supplier = {
      id: "11111111-1111-1111-1111-111111111111",
      companyName: "Acme Foods",
      countryCode: "TR",
    };
    state.lines = [{ ...createEmptyLine(), productName: "Oil", quantity: "100", unit: "ton" }];
    const payload = buildSubmitPayload(state);
    expect(payload.supplierId).toBe(state.supplier!.id);
    expect(payload.lines[0]).not.toHaveProperty("clientId");
  });

  it("detects meaningful wizard data", () => {
    expect(wizardHasMeaningfulData(createInitialWizardState())).toBe(false);
    const state = createInitialWizardState();
    state.lines[0].productName = "Test";
    expect(wizardHasMeaningfulData(state)).toBe(true);
  });
});
