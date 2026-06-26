import crypto from "node:crypto";
import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { catalogRfqIngestLimiter } from "../../middleware/rate-limit.js";
import { clientKey } from "../../middleware/redis-rate-limit.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpErrors.js";
import { logRfqIngestEvent } from "../../lib/security-audit.js";
import { recordFailure, checkLock, recordSuccess } from "../auth/bruteforce.js";
import { ingestCatalogRfq } from "./catalog-rfq-ingest.service.js";

function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function assertIngestToken(
  req: { header: (name: string) => string | undefined; ip?: string },
): Promise<void> {
  const token = env.CATALOG_RFQ_INGEST_TOKEN?.trim();
  if (!token) throw new AppError(503, "CATALOG_RFQ_INGEST_NOT_CONFIGURED");

  const ip = clientKey(req as Parameters<typeof clientKey>[0]);
  const lock = await checkLock(ip, "catalog-rfq-ingest");
  if (lock.locked) {
    logRfqIngestEvent(false, { ip, reason: "locked", retryInSec: lock.retryInSec });
    throw new AppError(429, "TOO_MANY_FAILED_ATTEMPTS");
  }

  const got = (req.header("X-DeMaxtore-Catalog-RFQ-Token") ?? "").trim();
  if (!got || !timingSafeEqualString(got, token)) {
    await recordFailure(ip, "catalog-rfq-ingest");
    logRfqIngestEvent(false, { ip, reason: "invalid_token" });
    throw new AppError(401, "INVALID_CATALOG_RFQ_TOKEN");
  }
  await recordSuccess(ip, "catalog-rfq-ingest");
}

export const publicCatalogRfqRouter = Router();

/** demaxtore.com katalog RFQ → workspace RFQ listesi */
publicCatalogRfqRouter.post(
  "/catalog-rfq",
  catalogRfqIngestLimiter,
  asyncHandler(async (req, res) => {
    const ip = clientKey(req);
    await assertIngestToken(req);

    try {
      const result = await ingestCatalogRfq(req.body);
      logRfqIngestEvent(true, {
        ip,
        sessionId: (req.body as { session_id?: string })?.session_id,
        duplicate: result.duplicate,
        workspaceId: (result.workspace as { id?: string })?.id,
        requestId: req.requestId,
      });
      res.status(result.duplicate ? 200 : 201).json(result);
    } catch (err) {
      logRfqIngestEvent(false, {
        ip,
        reason: err instanceof Error ? err.message : "ingest_error",
        requestId: req.requestId,
      });
      throw err;
    }
  }),
);

export const catalogRfqContextRouter = Router();

/** Embed iframe — oturumdaki alıcı e-postasını forma ön-doldurmak için */
catalogRfqContextRouter.get(
  "/catalog-rfq/context",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role !== "BUYER" && user.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN_ROLE");
    }
    res.json({ buyerEmail: user.email });
  }),
);
