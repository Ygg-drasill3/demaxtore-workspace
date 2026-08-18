import type { PrismaClient } from "@prisma/client";
import { AppError } from "../../utils/httpErrors.js";
import { writeStoredFile } from "../../lib/file-storage.js";
import { validateUpload, DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_ALLOWED_MIMES } from "../../lib/upload-security.js";
import type { AuthUser } from "./purchase-order.policy.js";

const PDF_MIMES = new Set([...DEFAULT_ALLOWED_MIMES, "application/pdf"]);

export function directPoDocumentPublicUrl(uploadId: string): string {
  return `/api/purchase-orders/direct/documents/${uploadId}`;
}

export function parseDirectPoDocumentUploadId(documentUrl: string): string | null {
  try {
    const path = documentUrl.startsWith("http") ? new URL(documentUrl).pathname : documentUrl;
    const match = path.match(/\/purchase-orders\/direct\/documents\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function uploadDirectPoDocument(
  db: PrismaClient,
  actor: AuthUser,
  file: { originalName: string; mimeType: string; sizeBytes: number; buffer: Buffer },
): Promise<{ documentUrl: string; documentFileName: string; uploadId: string }> {
  validateUpload(
    {
      originalname: file.originalName,
      mimetype: file.mimeType,
      size: file.sizeBytes,
      buffer: file.buffer,
    },
    { maxBytes: DEFAULT_MAX_UPLOAD_BYTES, allowedMimes: PDF_MIMES },
  );

  const { storageKey } = await writeStoredFile(file.buffer, file.originalName);
  const row = await db.directPoDocumentUpload.create({
    data: {
      uploadedById: actor.id,
      fileName: file.originalName,
      mimeType: file.mimeType,
      storageKey,
      fileSizeBytes: file.sizeBytes,
    },
  });

  return {
    uploadId: row.id,
    documentUrl: directPoDocumentPublicUrl(row.id),
    documentFileName: row.fileName,
  };
}

export async function assertDirectPoDocumentOwnership(
  db: PrismaClient,
  actor: AuthUser,
  documentUrl: string,
): Promise<{ uploadId: string; fileName: string }> {
  const uploadId = parseDirectPoDocumentUploadId(documentUrl);
  if (!uploadId) throw new AppError(400, "DOCUMENT_ACCESS_DENIED");

  const row = await db.directPoDocumentUpload.findUnique({ where: { id: uploadId } });
  if (!row) throw new AppError(404, "DOCUMENT_NOT_FOUND");
  if (row.uploadedById !== actor.id && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new AppError(403, "DOCUMENT_ACCESS_DENIED");
  }
  if (row.consumedAt) throw new AppError(409, "DOCUMENT_ALREADY_USED");

  return { uploadId: row.id, fileName: row.fileName };
}

export async function markDirectPoDocumentConsumed(
  db: PrismaClient,
  uploadId: string,
): Promise<void> {
  await db.directPoDocumentUpload.update({
    where: { id: uploadId },
    data: { consumedAt: new Date() },
  });
}
