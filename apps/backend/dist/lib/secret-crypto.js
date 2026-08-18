import crypto from "node:crypto";
import { env, isProd } from "../config/env.js";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
function deriveKey(masterKey) {
    return crypto.createHash("sha256").update(masterKey, "utf8").digest();
}
function getMasterKey() {
    const key = env.WHATSAPP_CONNECTION_ENCRYPTION_KEY ?? env.ENCRYPTION_MASTER_KEY ?? env.JWT_SECRET;
    if (!key || key.length < 32) {
        throw new Error("WHATSAPP_CONNECTION_ENCRYPTION_KEY must be at least 32 characters");
    }
    if (isProd && !env.WHATSAPP_CONNECTION_ENCRYPTION_KEY) {
        throw new Error("WHATSAPP_CONNECTION_ENCRYPTION_KEY is required in production");
    }
    return key;
}
/** Encrypt a secret for at-rest storage (AES-256-GCM, base64 payload). */
export function encryptSecret(plaintext) {
    const key = deriveKey(getMasterKey());
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
/** Decrypt a secret stored via encryptSecret. */
export function decryptSecret(ciphertext) {
    const key = deriveKey(getMasterKey());
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
//# sourceMappingURL=secret-crypto.js.map