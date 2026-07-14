import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("legacy operational email paths", () => {
  it("rfq.service does not send parallel notificationFallbackTemplate emails", () => {
    const src = readFileSync(path.join(root, "src/modules/rfq/rfq.service.ts"), "utf8");
    expect(src).not.toContain("notificationFallbackTemplate");
    expect(src).not.toMatch(/Critical notification → email fallback/);
  });

  it("commoditybid.service does not send parallel notificationFallbackTemplate emails", () => {
    const src = readFileSync(path.join(root, "src/modules/commoditybid/commoditybid.service.ts"), "utf8");
    expect(src).not.toContain("notificationFallbackTemplate");
    expect(src).not.toMatch(/Critical notification → email fallback/);
  });
});
