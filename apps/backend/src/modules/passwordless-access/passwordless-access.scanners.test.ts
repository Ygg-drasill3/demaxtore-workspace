import { describe, expect, it } from "vitest";
import { detectLinkScannerUserAgent } from "./passwordless-access.scanners.js";

describe("passwordless-access.scanners", () => {
  it("flags common link-scanner user agents", () => {
    expect(detectLinkScannerUserAgent("Mozilla/5.0 Proofpoint URL Defense")).toBe(true);
    expect(detectLinkScannerUserAgent("GoogleImageProxy")).toBe(true);
  });

  it("does not flag a normal browser UA", () => {
    expect(
      detectLinkScannerUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });
});
