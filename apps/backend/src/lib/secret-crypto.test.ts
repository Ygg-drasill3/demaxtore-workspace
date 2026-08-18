import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./secret-crypto.js";

describe("secret-crypto", () => {
  it("round-trips encrypted secrets", () => {
    const plaintext = "EAAxxxxxxxx-access-token";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });
});
