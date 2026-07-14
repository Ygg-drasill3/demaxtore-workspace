import { describe, it, expect } from "vitest";
import { groupQuotationsByProduct, productSectionTitle } from "../quotations-by-product";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

const lines = [
  { id: "line-soap", position: 1, description: "BAR SOAP 125g — Five product ranges." },
  { id: "line-paper", position: 2, description: "A4 PAPER REAM 500 sheets" },
];

function quote(
  id: string,
  supplier: string,
  lineId: string,
  desc: string,
  total: number,
): QuotationRowDTO {
  return {
    id,
    supplierId: `sup-${id}`,
    supplierName: supplier,
    total,
    currency: "USD",
    unitPriceAvg: total,
    leadTimeDays: null,
    moq: null,
    incoterm: "FOB",
    paymentTerms: null,
    sampleAvail: false,
    validUntil: null,
    status: "SUBMITTED",
    submittedAt: "2026-07-03T00:00:00.000Z",
    lineItems: [
      {
        id: `li-${id}`,
        rfqLineItemId: lineId,
        position: 1,
        description: desc,
        quantity: 1,
        unitPrice: total,
        total,
      },
    ],
  };
}

describe("groupQuotationsByProduct", () => {
  it("returns null for single-line RFQs", () => {
    expect(groupQuotationsByProduct([lines[0]!], [])).toBeNull();
  });

  it("groups bids under matching product lines", () => {
    const quotations = [
      quote("q1", "Heni", "line-soap", lines[0]!.description, 0.78),
      quote("q2", "Alkim", "line-paper", lines[1]!.description, 12.5),
    ];
    const groups = groupQuotationsByProduct(lines, quotations)!;
    expect(groups).toHaveLength(2);
    expect(groups[0]!.bids).toHaveLength(1);
    expect(groups[0]!.bids[0]!.quotation.supplierName).toBe("Heni");
    expect(groups[1]!.bids[0]!.quotation.supplierName).toBe("Alkim");
  });

  it("shortens long product titles", () => {
    expect(productSectionTitle("BAR SOAP 125g — Five product ranges.")).toContain("BAR SOAP");
  });
});
