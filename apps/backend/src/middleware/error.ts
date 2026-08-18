// apps/backend/src/middleware/error.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { ErrorCodes } from "@dmx/contracts";
import { HttpError } from "../lib/errors.js";
import { logger } from "../config/logger.js";

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  EMPTY_FILE: "The uploaded file is empty.",
  EXECUTABLE_BLOCKED: "Executable files are not allowed.",
  ZIP_BOMB_SUSPECTED: "This archive could not be accepted.",
  UPLOAD_REJECTED: "This file could not be uploaded.",
};

function uploadErrorResponse(err: Error): { status: number; code: string; message: string } | null {
  const msg = err.message;
  if (msg.startsWith("UNSUPPORTED_MIME:")) {
    return {
      status: 400,
      code: "UNSUPPORTED_MIME",
      message: "This file type is not allowed. Use PDF, PNG, JPEG, DOCX, or XLSX.",
    };
  }
  if (msg.startsWith("FILE_TOO_LARGE:")) {
    return { status: 400, code: "FILE_TOO_LARGE", message: "File exceeds the maximum upload size." };
  }
  if (UPLOAD_ERROR_MESSAGES[msg]) {
    return { status: 400, code: msg, message: UPLOAD_ERROR_MESSAGES[msg] };
  }
  return null;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: ErrorCodes.NOT_FOUND, message: "Route not found" } });
}

/**
 * A non-UUID path param reaches Prisma as P2023 "Error creating UUID". That is a
 * client-side miss, not a server fault, so it must not surface as 500. Matched on
 * the create-UUID text only — P2023 also covers genuine column corruption
 * ("Error converting field ..."), which must stay a 500.
 */
function isMalformedIdError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; message?: unknown };
  return (
    e.code === "P2023" &&
    typeof e.message === "string" &&
    e.message.includes("Error creating UUID")
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Request validation failed",
        details: { issues: err.issues.map((i) => ({ path: i.path, message: i.message })) },
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File exceeds the maximum upload size." : "Upload rejected.";
    res.status(400).json({ error: { code: err.code, message } });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof Error) {
    const upload = uploadErrorResponse(err);
    if (upload) {
      res.status(upload.status).json({ error: { code: upload.code, message: upload.message } });
      return;
    }
  }

  if (isMalformedIdError(err)) {
    logger.warn({ path: req.originalUrl }, "Malformed identifier in request path");
    res.status(404).json({ error: { code: ErrorCodes.NOT_FOUND, message: "Not found" } });
    return;
  }

  const id = req.headers["x-request-id"] ?? "—";
  logger.error({ err, requestId: id }, "Unhandled error");
  res.status(500).json({ error: { code: ErrorCodes.INTERNAL, message: "Internal server error" } });
}
