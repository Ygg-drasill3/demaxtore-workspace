import { describe, it, expect } from "vitest";
import { signHmacSha256, verifyHmacSha256 } from "./webhook-signature.js";

describe("webhook-signature", () => {
  const secret = "test-secret";
  const body = Buffer.from(JSON.stringify({ intentId: "pi_1", status: "paid" }));

  it("signs and verifies valid HMAC", () => {
    const sig = signHmacSha256(body, secret);
    expect(verifyHmacSha256(body, sig, secret)).toBe(true);
  });

  it("rejects tampered body", () => {
    const sig = signHmacSha256(body, secret);
    const tampered = Buffer.from(body.toString() + "x");
    expect(verifyHmacSha256(tampered, sig, secret)).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyHmacSha256(body, undefined, secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const sig = signHmacSha256(body, secret);
    expect(verifyHmacSha256(body, sig, "other-secret")).toBe(false);
  });

  it("accepts sha256= prefix in signature header", () => {
    const digest = signHmacSha256(body, secret).replace(/^sha256=/, "");
    expect(verifyHmacSha256(body, `sha256=${digest}`, secret)).toBe(true);
  });

  it("rejects replay with same body but invalid signature", () => {
    const sig = signHmacSha256(body, secret);
    expect(verifyHmacSha256(body, sig, secret)).toBe(true);
    expect(verifyHmacSha256(body, sig, "rotated-secret")).toBe(false);
  });
});
