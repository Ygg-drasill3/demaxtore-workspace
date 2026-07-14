import { describe, expect, it } from "vitest";
import {
  expandSearchTerms,
  extractProductSearchTerms,
  resolveFromMetadata,
  resolveRfqProductImageUrl,
  scoreProductMatch,
} from "./rfq-product-image.js";

describe("extractProductSearchTerms", () => {
  it("prefers line item name from catalog description", () => {
    const terms = extractProductSearchTerms({
      productCategory: "SPAGHETTI",
      productDescription: "Line items:\n\n- SPAGHETTI (product_id: form-abc) × 1 — note",
      lineItems: [{ description: "SPAGHETTI" }],
    });
    expect(terms[0]).toBe("SPAGHETTI");
  });

  it("expands popcorn line into popcorn token", () => {
    const terms = extractProductSearchTerms({
      lineItems: [{ description: "Microwave popcorn corn" }],
    });
    expect(terms.map((t) => t.toLowerCase())).toContain("popcorn");
  });
});

describe("scoreProductMatch", () => {
  it("scores spaghetti highly for spaghetti search", () => {
    expect(scoreProductMatch("Spaghetti", "SPAGHETTI")).toBeGreaterThanOrEqual(70);
  });

  it("does not score spaghetti for popcorn search", () => {
    expect(scoreProductMatch("Spaghetti", "Microwave popcorn corn")).toBeLessThan(20);
  });
});

describe("resolveFromMetadata", () => {
  it("returns top-level productImageUrl first", () => {
    const url = resolveFromMetadata({
      productImageUrl: "/uploads/spaghetti.webp",
      catalogIntake: { productImageUrl: "/other.jpg" },
    });
    expect(url).toBe("https://demaxtore.com/uploads/spaghetti.webp");
  });
});

describe("resolveRfqProductImageUrl", () => {
  it("uses metadata before any lookup", async () => {
    const url = await resolveRfqProductImageUrl({
      metadata: { productImageUrl: "https://cdn.example.com/saved.jpg" },
      productCategory: "SPAGHETTI",
    });
    expect(url).toBe("https://cdn.example.com/saved.jpg");
  });

  it("does not match cornflakes for popcorn line items", async () => {
    const { resolveLineItemProductImageUrl } = await import("./rfq-product-image.js");
    const url = await resolveLineItemProductImageUrl("popcorn-line-test-ws", "Microwave popcorn corn");
    expect(url).toBeNull();
  });
});

describe("expandSearchTerms", () => {
  it("deduplicates expanded tokens", () => {
    const terms = expandSearchTerms(["Spaghetti", "spaghetti"]);
    expect(terms).toHaveLength(1);
  });
});
