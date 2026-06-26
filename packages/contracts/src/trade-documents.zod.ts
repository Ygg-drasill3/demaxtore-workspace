import { z } from "zod";
import { DocumentOwner, TradeDocumentType } from "./trade-documents";

export const RequestDocumentPayload = z.object({
  documentType: z.enum(TradeDocumentType),
  ownerRole: z.enum(DocumentOwner).default("SUPPLIER"),
});
export type RequestDocumentPayload = z.infer<typeof RequestDocumentPayload>;

export const UploadDocumentPayload = z.object({
  documentType: z.enum(TradeDocumentType),
  ownerRole: z.enum(DocumentOwner).default("SUPPLIER"),
  fileId: z.string().min(1),
  fileName: z.string().min(1).max(512),
  expiresAt: z.string().datetime().optional(),
});
export type UploadDocumentPayload = z.infer<typeof UploadDocumentPayload>;

export const ReviewDocumentPayload = z.object({
  documentId: z.string().uuid(),
});
export type ReviewDocumentPayload = z.infer<typeof ReviewDocumentPayload>;

export const ApproveDocumentPayload = z.object({
  documentId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});
export type ApproveDocumentPayload = z.infer<typeof ApproveDocumentPayload>;

export const RejectDocumentPayload = z.object({
  documentId: z.string().uuid(),
  reason: z.string().min(3).max(2000),
});
export type RejectDocumentPayload = z.infer<typeof RejectDocumentPayload>;

export const ExpireDocumentPayload = z.object({
  documentId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});
export type ExpireDocumentPayload = z.infer<typeof ExpireDocumentPayload>;
