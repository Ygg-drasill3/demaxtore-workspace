import { describe, expect, it } from "vitest";

/** Mirror of duty-tax.service gtipMatchCandidates for unit coverage. */
function gtipMatchCandidates(gtipCode: string): string[] {
  const raw = gtipCode.trim();
  const digits = raw.replace(/\D/g, "");
  const out = new Set<string>([raw]);
  if (raw.endsWith(".00")) out.add(raw.slice(0, -3));
  else out.add(`${raw}.00`);
  if (digits.length >= 6) {
    const base = `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
    out.add(base);
    out.add(`${base}.00`);
    if (digits.length >= 8) {
      out.add(`${base}.${digits.slice(6, 8)}`);
    }
  }
  return [...out];
}

describe("GTIP normalize candidates", () => {
  it("maps 8501.52 to 8501.52.00", () => {
    const c = gtipMatchCandidates("8501.52");
    expect(c).toContain("8501.52");
    expect(c).toContain("8501.52.00");
  });

  it("keeps exact 8501.52.00", () => {
    const c = gtipMatchCandidates("8501.52.00");
    expect(c).toContain("8501.52.00");
    expect(c).toContain("8501.52");
  });
});
