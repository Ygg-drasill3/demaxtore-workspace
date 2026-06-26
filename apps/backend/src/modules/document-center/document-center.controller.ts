import type { Request, Response } from "express";
import multer from "multer";
import type { RequestHandler } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { writeStoredFile } from "../../lib/file-storage.js";
import { DocumentCenterQuery, DocumentReviewPayload, DocumentUploadPayload } from "@dmx/contracts/document-center";
import { DocumentCenterService } from "./document-center.service.js";
import { TradeDocumentsService } from "../trade-documents/documents.service.js";
import { canAccessTradeWorkspace } from "../trade-documents/documents.policy.js";

const service = new DocumentCenterService(prisma);
const tradeDocs = new TradeDocumentsService(prisma);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const uploadSingle = upload.single("file") as unknown as RequestHandler;

function decodeId(raw: string): string {
  return decodeURIComponent(raw);
}

export const documentCenterController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = DocumentCenterQuery.parse(req.query);
    res.json(await service.list(req.user!, query));
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getDetail(req.user!, decodeId(req.params.id)));
  }),

  download: asyncHandler(async (req: Request, res: Response) => {
    await service.streamDownload(req.user!, decodeId(req.params.id), res);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const body = DocumentUploadPayload.parse(req.body);
    const file = (req as Request & { file?: { originalname: string; buffer: Buffer } }).file;
    if (!file) throw new AppError(400, "FILE_REQUIRED");
    if (!(await canAccessTradeWorkspace(prisma, req.user!, body.workspaceType, body.workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const { storageKey: fileId } = await writeStoredFile(file.buffer, file.originalname);
    const result = await tradeDocs.applyDocumentAction(
      body.workspaceType,
      body.workspaceId,
      "upload_document",
      req.user!,
      {
        documentType: body.documentType,
        fileId,
        fileName: file.originalname,
        ownerRole: body.ownerRole ?? "SUPPLIER",
        expiresAt: body.expiresAt,
      },
      { ip: req.ip, userAgent: req.headers["user-agent"] },
    );
    res.status(201).json(result);
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const body = DocumentReviewPayload.parse(req.body ?? {});
    res.json(await service.approve(req.user!, decodeId(req.params.id), body.reason));
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const body = DocumentReviewPayload.parse(req.body);
    if (!body.reason) throw new AppError(400, "REASON_REQUIRED");
    res.json(await service.reject(req.user!, decodeId(req.params.id), body.reason));
  }),

  requestRevision: asyncHandler(async (req: Request, res: Response) => {
    const body = DocumentReviewPayload.parse(req.body);
    if (!body.reason) throw new AppError(400, "REASON_REQUIRED");
    res.json(await service.requestRevision(req.user!, decodeId(req.params.id), body.reason));
  }),

  tradeDocuments: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getTradeDocuments(req.user!, req.params.id));
  }),

  shipmentDocuments: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getShipmentDocuments(req.user!, req.params.id));
  }),
};
