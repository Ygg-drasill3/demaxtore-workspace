import { describe, expect, it } from "vitest";
import { resolveCatalogIntake } from "./catalogIntake";

const SAMPLE_RFQ = {
  title: "ORISHA — DeMaxtore catalog",
  productCategory: "Spaghetti",
  targetMarket: "BENIN",
  productDescription: `Catalog request:
Product or service: Spaghetti
Delivery location: BENIN
Quantity: 10 - 2
Supplier type: Manufacturer / Producer
Request details:
- Spaghetti, mainly Doğa brand - 10 containers
- Microwave popcorn corn - 2 containers

Your contact details:
Business email: buyer@dema.test
Company name: ORISHA
Contact person: Jean Dupont
Phone: +229 6630 0766

Shipping Info:
Delivery: BENIN
`,
};

describe("resolveCatalogIntake", () => {
  it("extracts all catalog form fields from structured description", () => {
    const intake = resolveCatalogIntake(SAMPLE_RFQ);
    expect(intake?.productOrService).toBe("Spaghetti");
    expect(intake?.deliveryLocation).toBe("BENIN");
    expect(intake?.supplierType).toBe("Manufacturer / Producer");
    expect(intake?.businessEmail).toBe("buyer@dema.test");
    expect(intake?.companyName).toBe("ORISHA");
    expect(intake?.contactPerson).toBe("Jean Dupont");
    expect(intake?.phone).toBe("+229 6630 0766");
  });
});
