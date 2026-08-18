// apps/backend/src/modules/auth/jwt.ts
// Access (15 min, HS256, JWT_SECRET) + refresh (7 d, HS256, JWT_REFRESH_SECRET).
// Refresh rotation: each refresh issues a new refresh token; the previous one
// is revoked. Refresh tokens are stored hashed (sha256) in `refresh_tokens`.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
export function signAccessToken(p) {
    return jwt.sign({ ...p, type: "access" }, env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: env.ACCESS_TOKEN_TTL_SEC,
    });
}
export function signPasswordlessSessionToken(p, expiresInSec) {
    return jwt.sign({ ...p, type: "access", accessMode: "passwordless" }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: expiresInSec });
}
export function signRefreshToken(p) {
    return jwt.sign({ ...p, type: "refresh" }, env.JWT_REFRESH_SECRET, {
        algorithm: "HS256",
        expiresIn: env.REFRESH_TOKEN_TTL_SEC,
    });
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (decoded.type !== "access")
        throw new Error("Wrong token type");
    return decoded;
}
export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
    if (decoded.type !== "refresh")
        throw new Error("Wrong token type");
    return decoded;
}
/** SHA-256 hash for storing refresh tokens at rest. */
export function hashToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}
/** New jti for a refresh token. */
export const newJti = () => crypto.randomUUID();
//# sourceMappingURL=jwt.js.map