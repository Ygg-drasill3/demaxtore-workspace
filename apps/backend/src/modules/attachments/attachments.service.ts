// apps/backend/src/modules/attachments/attachments.service.ts
import { prisma } from "../../db/prisma.js";
import { Forbidden, NotFound, Validation } from "../../lib/errors.js";
import { writeStoredFile, assertStoredFileExists } from "../../lib/file-storage.js";
import { validateUpload, DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_ALLOWED_MIMES } from "../../lib/upload-security.js";
import { canAccessRfq } from "../rfq/rfq.policy.js";
import type { AuthUser } from "../rfq/rfq.policy.js";

const MAX_SIZE_BYTES = DEFAULT_MAX_UPLOAD_BYTES;
const ALLOWED_MIMES = DEFAULT_ALLOWED_MIMES;

export interface UploadedFile {
  originalName: string;
  mimeType:     string;
  sizeBytes:    number;
  buffer:       Buffer;
}

export async function uploadAttachment(
  workspaceId: string,
  actor: AuthUser,
  file: UploadedFile,
) {
  if (file.sizeBytes > MAX_SIZE_BYTES) throw Validation(`File too large (max ${MAX_SIZE_BYTES} bytes)`);

  const { safeName } = validateUpload({
    originalname: file.originalName,
    mimetype: file.mimeType,
    size: file.sizeBytes,
    buffer: file.buffer,
  }, { maxBytes: MAX_SIZE_BYTES, allowedMimes: ALLOWED_MIMES });

  if (!(await canAccessRfq(prisma, actor, workspaceId))) throw Forbidden("No access to workspace");

  const { storageKey } = await writeStoredFile(file.buffer, safeName);

  // Versioning: increment when same fileName already exists in this workspace.
  const existing = await prisma.rfqAttachment.findFirst({
    where:   { workspaceId, fileName: safeName },
    orderBy: { version: "desc" },
    select:  { version: true },
  });
  const version = (existing?.version ?? 0) + 1;

  const row = await prisma.rfqAttachment.create({
    data: {
      workspaceId,
      fileName:      safeName,
      fileSizeBytes: file.sizeBytes,
      mimeType:      file.mimeType,
      storageKey,
      uploadedById:  actor.id,
      version,
    },
  });

  return {
    id:            row.id,
    workspaceId:   row.workspaceId,
    fileName:      row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    mimeType:      row.mimeType,
    version:       row.version,
    uploadedById:  row.uploadedById,
    uploadedAt:    row.uploadedAt.toISOString(),
  };
}

export async function getAttachmentForDownload(
  workspaceId: string,
  attachmentId: string,
  actor: AuthUser,
): Promise<{ row: { id: string; fileName: string; mimeType: string; storageKey: string; fileSizeBytes: number }; absPath: string }> {
  if (!(await canAccessRfq(prisma, actor, workspaceId))) throw Forbidden("No access to workspace");
  const row = await prisma.rfqAttachment.findUnique({ where: { id: attachmentId } });
  if (!row || row.workspaceId !== workspaceId) throw NotFound("Attachment not found");

  const absPath = await assertStoredFileExists(row.storageKey).catch(() => {
    throw NotFound("Attachment file missing on disk");
  });
  return { row, absPath };
}

export async function deleteAttachment(
  workspaceId: string,
  attachmentId: string,
  actor: AuthUser,
): Promise<void> {
  if (!(await canAccessRfq(prisma, actor, workspaceId))) throw Forbidden("No access to workspace");
  const row = await prisma.rfqAttachment.findUnique({ where: { id: attachmentId } });
  if (!row || row.workspaceId !== workspaceId) throw NotFound("Attachment not found");
  if (row.uploadedById !== actor.id && actor.role !== "ADMIN") {
    throw Forbidden("Only uploader or admin can delete this attachment");
  }
  const { deleteStoredFile } = await import("../../lib/file-storage.js");
  await deleteStoredFile(row.storageKey);
  await prisma.rfqAttachment.delete({ where: { id: attachmentId } });
}
