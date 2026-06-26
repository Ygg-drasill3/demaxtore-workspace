import fsp from "node:fs/promises";
import { resolveStorageProvider } from "./storage-provider.js";

export { resolveStorageProvider } from "./storage-provider.js";
export type { StorageProvider } from "./storage-provider.js";

/** Local-only: returns writable directory (throws when STORAGE_PROVIDER=s3). */
export async function getStorageDir(): Promise<string> {
  const provider = resolveStorageProvider();
  if (provider.name !== "local") throw new Error("STORAGE_NOT_LOCAL");
  const absPath = await provider.getPath("");
  return absPath.replace(/[/\\][^/\\]*$/, "") || absPath;
}

export async function storagePathFor(storageKey: string): Promise<string> {
  return resolveStorageProvider().getPath(storageKey);
}

export async function writeStoredFile(
  buffer: Buffer,
  originalName?: string,
): Promise<{ storageKey: string; absPath: string }> {
  const { storageKey } = await resolveStorageProvider().put(buffer, originalName);
  const absPath = await storagePathFor(storageKey);
  return { storageKey, absPath };
}

export async function assertStoredFileExists(storageKey: string): Promise<string> {
  const provider = resolveStorageProvider();
  const absPath = await provider.getPath(storageKey);
  if (provider.name === "local") {
    await fsp.stat(absPath).catch(() => { throw new Error("STORED_FILE_MISSING"); });
  }
  return absPath;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const provider = resolveStorageProvider();
  if (provider.name === "local") {
    const absPath = await provider.getPath(storageKey);
    await fsp.unlink(absPath).catch(() => undefined);
  }
}
