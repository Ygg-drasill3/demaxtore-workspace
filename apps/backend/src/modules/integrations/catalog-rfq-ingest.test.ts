import { describe, expect, it } from "vitest";
import { parseLineItems } from "./catalog-rfq-ingest.service.js";

const MULTI_PRODUCT_WITH_DELIVERY = `Line items:

- Pasta (product_id: form-c4f0f7b069f940c5) × 1 — No Need
Delivery: Hamad

- Olive Oil (product_id: form-696e1558c67240d3) × 1 — No Need
Delivery: Hamad

- Peanut Butter (product_id: form-f22a1c54f39b4fc7) × 1 — No Need
Delivery: Hamad

Company: Rawabi Food International

Phone: +974 6672 6799
`;

describe("parseLineItems", () => {
  it("parses all catalog products when Delivery lines sit between items", () => {
    const items = parseLineItems(MULTI_PRODUCT_WITH_DELIVERY, "Pasta, Olive Oil, Peanut Butter");
    expect(items.map((i) => i.description)).toEqual(["Pasta", "Olive Oil", "Peanut Butter"]);
    expect(items.every((i) => i.quantity === 1 && i.notes === "No Need")).toBe(true);
  });

  it("parses mixed product_id and container lines in one section", () => {
    const desc = `Line items:
- Pasta (product_id: form-033b29f47ec24138) × 10 — Spaghetti
- Microwave popcorn corn - 2 containers

Shipping Info:
Delivery: BENIN
`;
    const items = parseLineItems(desc, "Pasta");
    expect(items.map((i) => i.description)).toEqual([
      "Pasta",
      "Microwave popcorn corn",
    ]);
    expect(items[1]?.quantity).toBe(2);
    expect(items[1]?.uom).toBe("containers");
  });
});
