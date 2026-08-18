import fsp from "node:fs/promises";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolveStorageProvider } from "./storage-provider.js";
import { buildContentDisposition, isInlinePreviewable } from "./content-disposition.js";
import { env } from "../config/env.js";
export { resolveStorageProvider } from "./storage-provider.js";
/** Local-only: returns writable directory (throws when STORAGE_PROVIDER=s3). */
export async function getStorageDir() {
    const provider = resolveStorageProvider();
    if (provider.name !== "local")
        throw new Error("STORAGE_NOT_LOCAL");
    const absPath = await provider.getPath("");
    return absPath.replace(/[/\\][^/\\]*$/, "") || absPath;
}
export async function storagePathFor(storageKey) {
    return resolveStorageProvider().getPath(storageKey);
}
export async function writeStoredFile(buffer, originalName) {
    const { storageKey } = await resolveStorageProvider().put(buffer, originalName);
    const absPath = await storagePathFor(storageKey);
    return { storageKey, absPath };
}
export async function assertStoredFileExists(storageKey) {
    const provider = resolveStorageProvider();
    const absPath = await provider.getPath(storageKey);
    if (provider.name === "local") {
        await fsp.stat(absPath).catch(() => { throw new Error("STORED_FILE_MISSING"); });
    }
    return absPath;
}
export async function deleteStoredFile(storageKey) {
    const provider = resolveStorageProvider();
    if (provider.name === "local") {
        const absPath = await provider.getPath(storageKey);
        await fsp.unlink(absPath).catch(() => undefined);
    }
    else {
        await provider.delete(storageKey);
    }
}
/** Stream a stored file through Express without exposing storage paths or presigned URLs. */
export async function streamStoredFileToResponse(storageKey, res, opts) {
    const provider = resolveStorageProvider();
    const inline = isInlinePreviewable(opts.mimeType);
    res.setHeader("Content-Type", opts.mimeType);
    res.setHeader("Content-Length", String(opts.fileSizeBytes));
    res.setHeader("Content-Disposition", buildContentDisposition(opts.fileName, inline));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    if (provider.name === "local") {
        const absPath = await assertStoredFileExists(storageKey);
        await pipeline(fs.createReadStream(absPath), res);
        return;
    }
    const { GetObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    if (!env.S3_BUCKET)
        throw new Error("STORED_FILE_MISSING");
    const client = new S3Client({
        region: env.S3_REGION,
        credentials: env.AWS_ACCESS_KEY_ID
            ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "" }
            : undefined,
    });
    const obj = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));
    if (!obj.Body)
        throw new Error("STORED_FILE_MISSING");
    const { Readable } = await import("node:stream");
    const body = obj.Body;
    await pipeline(body, res);
}
//# sourceMappingURL=file-storage.js.map