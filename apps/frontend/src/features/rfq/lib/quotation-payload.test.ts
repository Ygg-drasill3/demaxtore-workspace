import { describe, expect, it } from "vitest";
import { buildSubmitQuotationPayload } from "./quotation-payload";

describe("buildSubmitQuotationPayload", () => {
  it("submits only lines with a unit price (partial multi-product quote)", () => {
    const payload = buildSubmitQuotationPayload({
      currency: "USD",
      leadTimeDays: "30",
      moq: "",
      paymentTerms: "",
      incoterm: "FOB",
      sampleAvail: "",
      validUntil: "",
      notes: "",
      lines: [
        {
          rfqLineItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          position: 1,
          description: "Pasta",
          quantity: "1",
          unitPrice: "12.5",
        },
        {
          rfqLineItemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          position: 2,
          description: "Olive Oil",
          quantity: "1",
          unitPrice: "",
        },
      ],
    });

    expect(payload.lineItems).toHaveLength(1);
    expect(payload.lineItems[0]?.description).toBe("Pasta");
    expect(payload.lineItems[0]?.unitPrice).toBe(12.5);
  });

  it("maps line uom to priceUnit for API submit", () => {
    const payload = buildSubmitQuotationPayload({
      currency: "USD",
      leadTimeDays: "",
      moq: "",
      paymentTerms: "",
      incoterm: "",
      sampleAvail: "",
      validUntil: "",
      notes: "",
      lines: [
        {
          position: 1,
          description: "500 ml Glass Bottle",
          quantity: "1",
          unitPrice: "2.10",
          uom: "piece",
          packing: "12 Bottles / Carton",
        },
      ],
    });
    expect(payload.lineItems[0]?.priceUnit).toBe("piece");
    expect(payload.lineItems[0]?.packing).toBe("12 Bottles / Carton");
  });
});
