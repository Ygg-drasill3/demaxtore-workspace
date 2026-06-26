import { describe, it, expect } from "vitest";
import { resolveIncotermProfile, INCOTERM_PROFILES } from "./incoterms.js";

describe("incoterms", () => {
  it("resolves FOB risk transfer at loaded on vessel", () => {
    expect(INCOTERM_PROFILES.FOB.riskTransferShipmentState).toBe("LOADED_ON_VESSEL");
  });

  it("defaults unknown to FOB profile", () => {
    expect(resolveIncotermProfile(null).code).toBe("FOB");
  });

  it("CIF requires insurance document", () => {
    expect(INCOTERM_PROFILES.CIF.requiredDocuments).toContain("INSURANCE_CERTIFICATE");
  });
});
