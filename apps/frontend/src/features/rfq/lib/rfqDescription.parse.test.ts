import { describe, expect, it } from "vitest";
import { dedupeFields, parseRfqDescription } from "./rfqDescription.parse";

const SAMPLE = `Line items:
- Pasta (product_id: form-033b29f47ec24138) × 10 — Spaghetti
- Microwave popcorn corn - 2 containers

Shipping Info:
Delivery: BENIN
Departure port: Izmir, Turkiye
Destination: BENIN
Delivery location: BENIN

Company Info:
Company: ORISHA
Phone: +229 6630 0766

Logistics / notes:
Product / service: Pasta

Request details:
- Pasta (product_id: form-033b29f47ec24138) × 10

Quantity:
10 - 2

System Info:
DeMaxtore session_id: abc123
`;

describe("parseRfqDescription", () => {
  it("parses catalog sections and skips redundant blocks", () => {
    const { sections, fallbackText } = parseRfqDescription(SAMPLE);
    expect(fallbackText).toBeNull();
    expect(sections.map((s) => s.title)).toEqual(["Shipping", "Company", "Logistics & notes"]);
    expect(sections[0]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Delivery", value: "BENIN" },
        { label: "Departure port", value: "Izmir, Turkiye" },
      ]),
    );
  });

  it("dedupes repeated fields", () => {
    const fields = dedupeFields([
      { label: "Destination", value: "BENIN" },
      { label: "Destination", value: "BENIN" },
    ]);
    expect(fields).toHaveLength(1);
  });

  it("returns fallback for plain text", () => {
    const { sections, fallbackText } = parseRfqDescription("Simple free text RFQ description here.");
    expect(sections).toHaveLength(0);
    expect(fallbackText).toContain("Simple free text");
  });

  it("includes all sections for PDF export", () => {
    const { sections } = parseRfqDescription(SAMPLE, { includeAll: true });
    expect(sections.map((s) => s.key)).toEqual([
      "line items",
      "shipping info",
      "company info",
      "logistics / notes",
      "request details",
      "quantity",
      "system info",
    ]);
    expect(sections[0]?.bullets[0]).toContain("product_id");
  });
});
