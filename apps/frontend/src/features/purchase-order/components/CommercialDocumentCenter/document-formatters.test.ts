import { describe, expect, it } from "vitest";
import {
  commercialCategoryLabel,
  commercialSourceLabel,
  formatFileSize,
  canInlinePreview,
} from "./document-formatters";

describe("document-formatters", () => {
  it("labels categories and sources", () => {
    expect(commercialCategoryLabel("COMMERCIAL_INVOICE")).toBe("Commercial Invoice");
    expect(commercialSourceLabel("SHIPMENT")).toBe("Shipment");
  });

  it("formats file sizes", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toMatch(/KB/);
    expect(formatFileSize(null)).toBe("—");
  });

  it("detects previewable mime types", () => {
    expect(canInlinePreview("application/pdf")).toBe(true);
    expect(canInlinePreview("image/png")).toBe(true);
    expect(canInlinePreview("application/zip")).toBe(false);
  });
});
