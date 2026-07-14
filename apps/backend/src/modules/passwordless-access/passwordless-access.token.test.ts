import { describe, expect, it } from "vitest";
import {
  signPasswordlessAccessToken,
  verifySignedPasswordlessToken,
  ttlMinutesToExpiry,
} from "./passwordless-access.token.js";

describe("passwordless-access.token", () => {
  it("signs and verifies token payload with exp", () => {
    const exp = Math.floor(Date.now() / 1000) + 1800;
    const raw = signPasswordlessAccessToken({
      jti: "11111111-1111-1111-1111-111111111111",
      uid: "22222222-2222-2222-2222-222222222222",
      wt: "RFQ",
      wid: "33333333-3333-3333-3333-333333333333",
      cid: "44444444-4444-4444-4444-444444444444",
      exp,
    });

    const payload = verifySignedPasswordlessToken(raw);
    expect(payload.jti).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.wt).toBe("RFQ");
  });

  it("rejects tampered signature", () => {
    const exp = Math.floor(Date.now() / 1000) + 1800;
    const raw = signPasswordlessAccessToken({
      jti: "11111111-1111-1111-1111-111111111111",
      uid: "22222222-2222-2222-2222-222222222222",
      wt: "RFQ",
      wid: "33333333-3333-3333-3333-333333333333",
      cid: "44444444-4444-4444-4444-444444444444",
      exp,
    });
    const tampered = `${raw}x`;
    expect(() => verifySignedPasswordlessToken(tampered)).toThrow();
  });

  it("maps ttl presets", () => {
    const now = new Date("2026-07-13T10:00:00Z");
    expect(ttlMinutesToExpiry("FIFTEEN_MINUTES", now).getTime() - now.getTime()).toBe(15 * 60_000);
    expect(ttlMinutesToExpiry("ONE_HOUR", now).getTime() - now.getTime()).toBe(60 * 60_000);
  });
});
