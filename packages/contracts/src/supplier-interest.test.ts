import { describe, it, expect } from "vitest";
import {
  interestLabelsMatchCategory,
  normalizeInterestLabels,
} from "./supplier-interest";

describe("normalizeInterestLabels", () => {
  it("trims, dedupes case-insensitively, and caps length", () => {
    expect(
      normalizeInterestLabels(["  Makarna  ", "makarna", "Un", ""]),
    ).toEqual(["Makarna", "Un"]);
  });
});

describe("interestLabelsMatchCategory", () => {
  it("matches overlapping free-text labels", () => {
    expect(interestLabelsMatchCategory(["Makarna & İrmik", "Un"], "Pasta")).toBe(false);
    expect(interestLabelsMatchCategory(["Makarna", "Un"], "Makarna RFQ")).toBe(true);
    expect(interestLabelsMatchCategory(["Ayçiçek Yağı"], "yağ")).toBe(true);
  });

  it("returns false for empty inputs", () => {
    expect(interestLabelsMatchCategory([], "Makarna")).toBe(false);
    expect(interestLabelsMatchCategory(["Makarna"], "")).toBe(false);
  });
});
