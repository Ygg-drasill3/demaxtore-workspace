import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("reference freight admin routes mounted (REF-001)", () => {
  it("registers /admin/reference-freight-rates in routes.ts", () => {
    const routes = readFileSync(path.join(root, "src/routes.ts"), "utf8");
    expect(routes).toContain("referenceFreightAdminRouter");
    expect(routes).toContain('"/admin/reference-freight-rates"');
  });
});
