import { describe, it, expect } from "vitest";
import { parseArgs } from "../../../scripts/messaging-backfill.js";

describe("messaging-backfill parseArgs", () => {
  it("defaults to dry-run workspace source", () => {
    const args = parseArgs([]);
    expect(args.dryRun).toBe(true);
    expect(args.apply).toBe(false);
    expect(args.sources).toEqual(["workspace"]);
  });

  it("parses --all sources", () => {
    const args = parseArgs(["--dry-run", "--all"]);
    expect(args.sources).toEqual(["workspace", "direct", "whatsapp", "clarification"]);
  });

  it("parses single source and output report path", () => {
    const args = parseArgs(["--dry-run", "--source=whatsapp", "--output-report=/tmp/r.json"]);
    expect(args.sources).toEqual(["whatsapp"]);
    expect(args.outputReport).toBe("/tmp/r.json");
  });
});
