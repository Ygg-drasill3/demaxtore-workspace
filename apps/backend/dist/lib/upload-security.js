// Central upload validation — MIME allowlist, size, zip-bomb, executable guard.
import path from "node:path";
export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const DEFAULT_ALLOWED_MIMES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/msword",
    "text/csv",
    "text/plain",
]);
const EXECUTABLE_MAGIC = [
    { offset: 0, bytes: [0x4d, 0x5a] }, // PE / DOS
    { offset: 0, bytes: [0x7f, 0x45, 0x4c, 0x46] }, // ELF
    { offset: 0, bytes: [0xca, 0xfe, 0xba, 0xbe] }, // Mach-O fat
    { offset: 0, bytes: [0xcf, 0xfa, 0xed, 0xfe] }, // Mach-O
];
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const MAX_ZIP_UNCOMPRESSED_RATIO = 100;
const MAX_ZIP_SCAN_BYTES = 512_000;
export function sanitizeFilename(name) {
    const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200);
    return base || "upload.bin";
}
export function assertAllowedMime(mime, allowed = DEFAULT_ALLOWED_MIMES) {
    if (!allowed.has(mime)) {
        throw new Error(`UNSUPPORTED_MIME:${mime}`);
    }
}
export function assertMaxSize(sizeBytes, max = DEFAULT_MAX_UPLOAD_BYTES) {
    if (sizeBytes <= 0)
        throw new Error("EMPTY_FILE");
    if (sizeBytes > max)
        throw new Error(`FILE_TOO_LARGE:${max}`);
}
export function assertNotExecutable(buffer) {
    for (const sig of EXECUTABLE_MAGIC) {
        if (buffer.length < sig.offset + sig.bytes.length)
            continue;
        const match = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
        if (match)
            throw new Error("EXECUTABLE_BLOCKED");
    }
}
/** Reject zip bombs: high compression ratio on small declared payloads. */
export function assertNotZipBomb(buffer, mime) {
    const isZip = mime === "application/zip"
        || mime === "application/x-zip-compressed"
        || (buffer.length >= 4 && ZIP_MAGIC.every((b, i) => buffer[i] === b));
    if (!isZip)
        return;
    const scanLen = Math.min(buffer.length, MAX_ZIP_SCAN_BYTES);
    let literal = 0;
    for (let i = 0; i < scanLen; i++) {
        if (buffer[i] !== 0)
            literal++;
    }
    const ratio = scanLen / Math.max(literal, 1);
    if (ratio > MAX_ZIP_UNCOMPRESSED_RATIO) {
        throw new Error("ZIP_BOMB_SUSPECTED");
    }
}
export function validateUpload(file, opts) {
    const max = opts?.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
    const allowed = opts?.allowedMimes ?? DEFAULT_ALLOWED_MIMES;
    assertMaxSize(file.size, max);
    assertAllowedMime(file.mimetype, allowed);
    assertNotExecutable(file.buffer);
    assertNotZipBomb(file.buffer, file.mimetype);
    return { safeName: sanitizeFilename(file.originalname) };
}
//# sourceMappingURL=upload-security.js.map