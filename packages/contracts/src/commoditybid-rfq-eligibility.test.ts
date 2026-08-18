import { describe, it, expect } from "vitest";
import {
  assessRfqCommodityBidEligibility,
  matchCommodityProduct,
  commodityBidEligibilityErrorMessage,
} from "./commoditybid-rfq-eligibility";

describe("commoditybid-rfq-eligibility", () => {
  it("matches spaghetti and Turkish pasta terms", () => {
    expect(matchCommodityProduct("Spaghetti")?.slug).toBe("pasta");
    expect(matchCommodityProduct("makarna")?.slug).toBe("pasta");
  });

  it("matches sunflower oil in EN and TR", () => {
    expect(matchCommodityProduct("Refined Sunflower Oil 1L")?.slug).toBe("sunflower-oil");
    expect(matchCommodityProduct("Ayçiçek yağı")?.slug).toBe("sunflower-oil");
  });

  it("matches semolina and bulgur", () => {
    expect(matchCommodityProduct("Durum Semolina")?.slug).toBe("semolina");
    expect(matchCommodityProduct("İrmik")?.slug).toBe("semolina");
    expect(matchCommodityProduct("Yellow Bulgur Coarse")?.slug).toBe("bulgur");
  });

  it("rejects non-commodity products", () => {
    expect(matchCommodityProduct("Cumin")).toBeNull();
    expect(matchCommodityProduct("steel")).toBeNull();
  });

  it("allows RFQ when all lines are commodity products", () => {
    const result = assessRfqCommodityBidEligibility({
      productCategory: "Pasta",
      lineItems: [{ description: "Spaghetti 400g" }],
    });
    expect(result.eligible).toBe(true);
    expect(result.blockingLineItems).toEqual([]);
  });

  it("blocks RFQ when any line is not a commodity product", () => {
    const result = assessRfqCommodityBidEligibility({
      productCategory: "Commodity",
      lineItems: [{ description: "copper" }, { description: "Spaghetti" }],
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingLineItems).toContain("copper");
  });

  it("blocks when category is explicitly non-commodity", () => {
    const result = assessRfqCommodityBidEligibility({
      productCategory: "Industrial machinery",
      lineItems: [{ description: "bulgur" }],
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingCategory).toBe("Industrial machinery");
  });

  it("builds Turkish error message with allowed list", () => {
    const result = assessRfqCommodityBidEligibility({
      productCategory: "E2E",
      lineItems: [{ description: "widget" }],
    });
    const msg = commodityBidEligibilityErrorMessage(result, "tr");
    expect(msg).toMatch(/Commodity olmayan bir ürün seçtiniz/i);
    expect(msg).toMatch(/Spaghetti/i);
    expect(msg).toMatch(/Ayçiçek/i);
    expect(msg).toMatch(/İrmik|Semolina/i);
    expect(msg).toMatch(/Bulgur/i);
  });
});
