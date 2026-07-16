import path from "node:path";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { writeStoredFile } from "../../lib/file-storage.js";

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

const MIME_WHITELIST = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/ogg",
  "audio/mpeg",
  "audio/aac",
  "audio/amr",
  "video/mp4",
  "video/3gpp",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeFilename(name: string | null | undefined, mimeType: string | null): string {
  const base = (name ?? "media")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 120);
  if (base.includes("..") || path.isAbsolute(base)) return `media_${Date.now()}`;
  if (!base.includes(".") && mimeType) {
    const ext = mimeType.split("/")[1]?.split("+")[0];
    if (ext) return `${base}.${ext}`;
  }
  return base || `media_${Date.now()}`;
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  opts?: { filename?: string | null; mimeType?: string | null },
): Promise<{ storageKey: string; mimeType: string; filename: string } | null> {
  const token = env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = env.WHATSAPP_API_VERSION;
  if (!token) {
    logger.warn("[WA-Inbox] media download skipped — no access token configured");
    return null;
  }

  try {
    const metaResp = await fetch(`https://graph.facebook.com/${apiVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaResp.ok) {
      logger.warn({ mediaId, status: metaResp.status }, "[WA-Inbox] media metadata fetch failed");
      return null;
    }
    const meta = (await metaResp.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!meta.url) return null;

    if (meta.file_size && meta.file_size > MAX_MEDIA_BYTES) {
      logger.warn({ mediaId, size: meta.file_size }, "[WA-Inbox] media too large");
      return null;
    }

    const mimeType = opts?.mimeType ?? meta.mime_type ?? "application/octet-stream";
    if (!MIME_WHITELIST.has(mimeType)) {
      logger.warn({ mediaId, mimeType }, "[WA-Inbox] mime type not allowed");
      return null;
    }

    const fileResp = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileResp.ok) return null;

    const buffer = Buffer.from(await fileResp.arrayBuffer());
    if (buffer.length > MAX_MEDIA_BYTES) {
      logger.warn({ mediaId, size: buffer.length }, "[WA-Inbox] downloaded media too large");
      return null;
    }

    const filename = safeFilename(opts?.filename, mimeType);
    const { storageKey } = await writeStoredFile(buffer, filename);
    return { storageKey, mimeType, filename };
  } catch (err) {
    logger.error({ err, mediaId }, "[WA-Inbox] media download failed");
    return null;
  }
}
