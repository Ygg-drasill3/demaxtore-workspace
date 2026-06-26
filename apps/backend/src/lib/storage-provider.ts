import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export interface StorageProvider {
  readonly name: "local" | "s3";
  put(buffer: Buffer, originalName?: string): Promise<{ storageKey: string }>;
  getPath(storageKey: string): Promise<string>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl?(storageKey: string, expiresSec?: number): Promise<string>;
}

class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  private resolvedDir: string | null = null;

  private candidateDirs(): string[] {
    const cwd = process.cwd();
    const configured = env.STORAGE_DIR.trim();
    const dirs = configured ? [configured] : [];
    dirs.push(path.join(cwd, ".data", "uploads"), path.join(cwd, "..", "..", ".data", "uploads"));
    return [...new Set(dirs.map((d) => path.resolve(d)))];
  }

  async getDir(): Promise<string> {
    if (this.resolvedDir) return this.resolvedDir;
    for (const dir of this.candidateDirs()) {
      try {
        await fsp.mkdir(dir, { recursive: true });
        await fsp.access(dir, fs.constants.W_OK | fs.constants.R_OK);
        this.resolvedDir = dir;
        return dir;
      } catch { continue; }
    }
    throw new Error("FILE_STORAGE_UNAVAILABLE");
  }

  async put(buffer: Buffer, originalName?: string): Promise<{ storageKey: string }> {
    const dir = await this.getDir();
    const ext = originalName ? path.extname(originalName).slice(0, 16) : "";
    const storageKey = `${crypto.randomUUID()}${ext}`;
    await fsp.writeFile(path.join(dir, storageKey), buffer);
    return { storageKey };
  }

  async getPath(storageKey: string): Promise<string> {
    const dir = await this.getDir();
    if (!storageKey) return dir;
    const base = path.resolve(dir);
    const abs = path.resolve(base, storageKey);
    if (abs !== base && !abs.startsWith(`${base}${path.sep}`)) throw new Error("INVALID_STORAGE_KEY");
    return abs;
  }

  async delete(storageKey: string): Promise<void> {
    const abs = await this.getPath(storageKey);
    await fsp.unlink(abs).catch(() => undefined);
  }
}

class S3StorageProvider implements StorageProvider {
  readonly name = "s3" as const;

  private async client() {
    if (!env.S3_BUCKET) throw new Error("S3_BUCKET not configured");
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: env.S3_REGION,
      credentials: env.AWS_ACCESS_KEY_ID
        ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "" }
        : undefined,
    });
  }

  async put(buffer: Buffer, originalName?: string): Promise<{ storageKey: string }> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const ext = originalName ? path.extname(originalName).slice(0, 16) : "";
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const client = await this.client();
    await client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: storageKey,
      Body: buffer,
    }));
    return { storageKey };
  }

  async getPath(storageKey: string): Promise<string> {
    return this.getSignedUrl(storageKey);
  }

  async delete(storageKey: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }));
  }

  async getSignedUrl(storageKey: string, expiresSec = 3600): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.client();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }), { expiresIn: expiresSec });
  }
}

let cached: StorageProvider | null = null;

export function resolveStorageProvider(): StorageProvider {
  if (cached) return cached;
  cached = env.STORAGE_PROVIDER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  return cached;
}
