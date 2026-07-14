import crypto from "node:crypto";
import { passwordlessAccessSecret } from "../../config/env.js";

export interface SignedPasswordlessPayload {
  v: 1;
  jti: string;
  uid: string;
  wt: string;
  wid: string;
  cid: string;
  exp: number;
}

export function ttlMinutesToExpiry(ttl: string, now = new Date()): Date {
  const d = new Date(now);
  switch (ttl) {
    case "FIFTEEN_MINUTES":
      d.setMinutes(d.getMinutes() + 15);
      return d;
    case "ONE_HOUR":
      d.setHours(d.getHours() + 1);
      return d;
    case "TWENTY_FOUR_HOURS":
      d.setHours(d.getHours() + 24);
      return d;
    case "THIRTY_MINUTES":
    default:
      d.setMinutes(d.getMinutes() + 30);
      return d;
  }
}

export function signPasswordlessAccessToken(payload: Omit<SignedPasswordlessPayload, "v">): string {
  const body: SignedPasswordlessPayload = { v: 1, ...payload };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", passwordlessAccessSecret())
    .update(`v1.${encoded}`)
    .digest("base64url");
  return `v1.${encoded}.${sig}`;
}

export function verifySignedPasswordlessToken(raw: string): SignedPasswordlessPayload {
  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("INVALID_FORMAT");
  }
  const encoded = parts[1]!;
  const sig = parts[2]!;
  const expected = crypto
    .createHmac("sha256", passwordlessAccessSecret())
    .update(`v1.${encoded}`)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("INVALID_SIGNATURE");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedPasswordlessPayload;
  if (payload.v !== 1) throw new Error("INVALID_VERSION");
  if (!payload.jti || !payload.uid || !payload.wt || !payload.wid || !payload.cid || !payload.exp) {
    throw new Error("INVALID_PAYLOAD");
  }
  if (payload.exp * 1000 < Date.now()) throw new Error("EXPIRED");
  return payload;
}
