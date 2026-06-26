import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";

const HEADER = "x-e2e-test-secret";

function secretsMatch(provided: string, secret: string): boolean {
  if (!provided || provided.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

/** Validate raw secret string (header, socket auth, etc.). */
export function isValidE2eSecretValue(provided: string | undefined | null): boolean {
  const secret = env.E2E_TEST_SECRET;
  if (!secret || secret.length < 32 || !provided) return false;
  return secretsMatch(provided, secret);
}

/** True when request carries a valid E2E_TEST_SECRET (server-side only, never public). */
export function isValidE2eBypass(req: Request): boolean {
  const raw = req.headers[HEADER];
  const provided = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  return isValidE2eSecretValue(provided);
}

export const E2E_BYPASS_HEADER = HEADER;
