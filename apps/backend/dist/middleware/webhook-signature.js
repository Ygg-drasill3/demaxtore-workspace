import { createHmac, timingSafeEqual } from "node:crypto";
const SIG_PREFIX = "sha256=";
export function signHmacSha256(rawBody, secret) {
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    return `${SIG_PREFIX}${digest}`;
}
export function verifyHmacSha256(rawBody, signatureHeader, secret) {
    if (!signatureHeader?.trim() || !secret)
        return false;
    const expected = signHmacSha256(rawBody, secret);
    const provided = signatureHeader.trim();
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length)
        return false;
    return timingSafeEqual(a, b);
}
//# sourceMappingURL=webhook-signature.js.map