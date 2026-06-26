import { describe, expect, it } from "vitest";
import {
  BULK_CONTAINER_LOCKED_PACKING_TYPES,
  BULK_CONTAINER_PACKING_CATALOG_VERSION,
  isLockedBulkContainerPackingCode,
  lockedPackingCodesForCategory,
  validateBulkContainerPackingAssignment,
} from "./bulk-container-packing-locked.js";

describe("BulkContainer locked packing catalog", () => {
  it("has catalog version 1.0", () => {
    expect(BULK_CONTAINER_PACKING_CATALOG_VERSION).toBe("1.0");
  });

  it("defines exactly 15 locked packing types", () => {
    expect(BULK_CONTAINER_LOCKED_PACKING_TYPES).toHaveLength(15);
  });

  it("wheat flour has 25kg and 50kg bags only", () => {
    expect(lockedPackingCodesForCategory("wheat-flour")).toEqual([
      "PT-BC-FLOUR-25KG",
      "PT-BC-FLOUR-50KG",
    ]);
  });

  it("salt includes 1000kg big bag", () => {
    expect(lockedPackingCodesForCategory("salt")).toContain("PT-BC-SALT-1000KG");
  });

  it("pasta has 5/10/20/25 kg", () => {
    expect(lockedPackingCodesForCategory("pasta")).toEqual([
      "PT-BC-PASTA-5KG",
      "PT-BC-PASTA-10KG",
      "PT-BC-PASTA-20KG",
      "PT-BC-PASTA-25KG",
    ]);
  });

  it("rejects unknown BC packing codes", () => {
    expect(isLockedBulkContainerPackingCode("PT-BC-FLOUR-30KG")).toBe(false);
    expect(validateBulkContainerPackingAssignment("wheat-flour", "PT-BC-FLOUR-30KG")).toMatch(/locked/i);
  });

  it("rejects valid code on wrong category", () => {
    expect(validateBulkContainerPackingAssignment("pasta", "PT-BC-FLOUR-25KG")).toMatch(/not valid/i);
  });
});
