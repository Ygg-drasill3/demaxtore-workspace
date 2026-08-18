import { describe, it, expect } from "vitest";
import {
  stripCustomerTextFromDescription,
  redactRfqTitleForSupplier,
  redactRfqDtoForSupplier,
} from "./supplier-rfq-redact.js";

describe("supplier-rfq-redact", () => {
  it("strips contact lines from product description", () => {
    const raw = `Request details:
- BAR SOAP 125g

Company: ECODIS
Phone: +230 5255 0324

Your contact details:
Business email: buyer@example.com
Company name: ECODIS
Contact person: Jean
Phone: +230 5255 0324`;
    const out = stripCustomerTextFromDescription(raw);
    expect(out).toContain("BAR SOAP");
    expect(out).not.toContain("ECODIS");
    expect(out).not.toContain("buyer@example.com");
    expect(out).not.toContain("Your contact details");
  });

  it("redacts buyer prefix from title", () => {
    expect(redactRfqTitleForSupplier("ECODIS — DeMaxtore catalog", "Personal care")).toBe(
      "DeMaxtore catalog",
    );
  });

  it("removes catalog intake and masks owner for suppliers", () => {
    const out = redactRfqDtoForSupplier(
      {
        title: "ECODIS — Catalog",
        productCategory: "Personal care",
        productDescription: "Company: Secret Co",
        ownerName: "Ugur Buyer",
        ownerUserId: "buyer-1",
        catalogIntake: { companyName: "Secret Co" },
        participants: [
          { userId: "buyer-1", participantRole: "OWNER" },
          { userId: "sup-1", participantRole: "COUNTERPARTY" },
        ],
        lineItems: [{ id: "l1", position: 1, description: "Soap", quantity: 1, uom: "PCS", targetPrice: 99 }],
      },
      "sup-1",
    );
    expect(out.ownerName).toBe("Buyer");
    expect(out.catalogIntake).toBeNull();
    expect(out.participants).toHaveLength(1);
    expect(out.lineItems?.[0]?.targetPrice).toBeUndefined();
    expect(out.productDescription).not.toContain("Secret Co");
  });

  it("limits line items to supplier product scope when assigned", () => {
    const out = redactRfqDtoForSupplier(
      {
        title: "Buyer — Catalog",
        productCategory: "Pasta, Wheat Flour, Olive Oil",
        productDescription: "Multi product RFQ",
        ownerName: "Buyer",
        participants: [{ userId: "sup-1", participantRole: "COUNTERPARTY" }],
        allowedQuoteLineItemIds: ["line-pasta"],
        lineItems: [
          { id: "line-pasta", position: 1, description: "Pasta", quantity: 1, uom: "Piece" },
          { id: "line-flour", position: 2, description: "Wheat Flour", quantity: 1, uom: "Piece" },
          { id: "line-oil", position: 3, description: "Olive Oil", quantity: 1, uom: "Piece" },
        ],
      },
      "sup-1",
    );
    expect(out.lineItems).toHaveLength(1);
    expect(out.lineItems?.[0]?.id).toBe("line-pasta");
    expect(out.productCategory).toBe("Pasta");
  });
});
