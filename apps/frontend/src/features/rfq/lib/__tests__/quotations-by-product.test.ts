import { describe, it, expect } from "vitest";
import { groupQuotationsByProduct, productSectionTitle, buildProductQuotationSections } from "../quotations-by-product";
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

  it("groups multiple variant lines for the same RFQ product into one offer row", () => {
    const quotations = [
      {
        ...quote("q1", "TAT", "line-soap", "BAR SOAP 125g — Range A", 0.78),
        lineItems: [
          {
            id: "li-q1a",
            rfqLineItemId: "line-soap",
            position: 1,
            description: "BAR SOAP 125g — Range A",
            quantity: 1,
            unitPrice: 0.78,
            total: 0.78,
          },
          {
            id: "li-q1b",
            rfqLineItemId: "line-soap",
            position: 2,
            description: "BAR SOAP 125g — Range B",
            quantity: 2,
            unitPrice: 0.82,
            total: 1.64,
          },
        ],
      },
    ];
    const groups = groupQuotationsByProduct(lines, quotations)!;
    expect(groups[0]!.bids).toHaveLength(2);
    const sections = buildProductQuotationSections(lines, quotations)!;
    expect(sections[0]!.rows).toHaveLength(1);
    expect(sections[0]!.rows[0]!.key).toBe("q1");
    expect(sections[0]!.rows[0]!.variations).toHaveLength(2);
    expect(sections[0]!.rows[0]!.variations.map((v) => v.name)).toEqual([
      "BAR SOAP 125g — Range A",
      "BAR SOAP 125g — Range B",
    ]);
  });

  it("builds one section per RFQ line in order", () => {
    const quotations = [
      quote("q1", "Heni", "line-paper", lines[1]!.description, 12.5),
      quote("q2", "Alkim", "line-soap", lines[0]!.description, 0.78),
    ];
    const sections = buildProductQuotationSections(lines, quotations)!;
    expect(sections).toHaveLength(2);
    expect(sections.map((s) => s.productTitle)).toEqual([
      productSectionTitle(lines[0]!.description),
      productSectionTitle(lines[1]!.description),
    ]);
    expect(sections[0]!.rows).toHaveLength(1);
    expect(sections[0]!.rows[0]!.quotation.supplierName).toBe("Alkim");
    expect(sections[1]!.rows[0]!.quotation.supplierName).toBe("Heni");
  });

  it("matches variant descriptions to the parent RFQ line", () => {
    const oliveLines = [
      { id: "line-oil", position: 1, description: "Olive Oil" },
      { id: "line-pasta", position: 2, description: "Pasta" },
    ];
    const quotations: QuotationRowDTO[] = [
      {
        ...quote("q1", "TAT", "line-oil", "Olive Oil", 4.5),
        lineItems: [
          {
            id: "li-var",
            position: 1,
            description: "Olive Oil — 500 ml",
            quantity: 1,
            unitPrice: 4.5,
            total: 4.5,
          },
        ],
      },
    ];
    const groups = groupQuotationsByProduct(oliveLines, quotations)!;
    expect(groups[0]!.bids).toHaveLength(1);
    expect(groups[1]!.bids).toHaveLength(0);
  });

  it("shortens long product titles", () => {
    expect(productSectionTitle("BAR SOAP 125g — Five product ranges.")).toContain("BAR SOAP");
  });
});
