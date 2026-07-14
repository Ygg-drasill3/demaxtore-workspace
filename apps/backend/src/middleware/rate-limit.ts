import type { Request, Response, NextFunction } from "express";
import { isProd } from "../config/env.js";
import {
  authenticatedOrIpKey,
  createRedisRateLimiter,
  checkRedisSocketHandshakeLimit,
  refreshCookieKey,
  type RedisRateLimitOptions,
} from "./redis-rate-limit.js";

/** Override via LOGIN_RATE_LIMIT_MAX env var for E2E test environments. */
const BURST_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? (isProd ? "50" : "300"), 10);

export type RateLimitOptions = RedisRateLimitOptions;

/** Redis-backed rate limiter — required for all environments (REDIS_URL must be set). */
export function createRateLimiter(opts: RateLimitOptions) {
  return createRedisRateLimiter(opts);
}

// ── Auth endpoints (stricter) ────────────────────────────────────────────────
export const refreshBurstLimiter = createRateLimiter({
  keyPrefix: "auth-refresh",
  windowMs: 15 * 60_000,
  max: isProd ? 600 : 600,
  label: "auth-refresh",
  keyFn: refreshCookieKey,
});

export const loginBurstLimiter = createRateLimiter({
  keyPrefix: "auth-login",
  windowMs: 15 * 60_000,
  max: BURST_MAX,
  label: "auth-login",
});

export const forgotBurstLimiter = createRateLimiter({
  keyPrefix: "auth-forgot",
  windowMs: 15 * 60_000,
  max: 50,
  label: "auth-forgot",
});

export const resetBurstLimiter = createRateLimiter({
  keyPrefix: "auth-reset",
  windowMs: 15 * 60_000,
  max: BURST_MAX,
  label: "auth-reset",
});

export const consumeBurstLimiter = createRateLimiter({
  keyPrefix: "passwordless-consume",
  windowMs: 15 * 60_000,
  max: BURST_MAX,
  label: "passwordless-consume",
});

export const registerBurstLimiter = createRateLimiter({
  keyPrefix: "auth-register",
  windowMs: 15 * 60_000,
  max: isProd ? 20 : 100,
  label: "auth-register",
});

// ── General API (normal users) ───────────────────────────────────────────────
export const apiGlobalLimiter = createRateLimiter({
  keyPrefix: "api-global",
  windowMs: 15 * 60_000,
  max: isProd ? 10_000 : 10_000,
  label: "api-global",
  keyFn: authenticatedOrIpKey,
  /** Logged-in workspace users are not throttled — auth/webhook/ingest keep their own limits. */
  skipIfAuthenticated: true,
});

export const telemetryBurstLimiter = createRateLimiter({
  keyPrefix: "telemetry",
  windowMs: 15 * 60_000,
  max: BURST_MAX,
  label: "telemetry",
});

export const adminAnalyticsLimiter = createRateLimiter({
  keyPrefix: "admin-analytics",
  windowMs: 60_000,
  max: isProd ? 300 : 300,
  label: "admin-analytics",
  keyFn: authenticatedOrIpKey,
  skipIfAuthenticated: true,
});

// ── Webhooks (per-IP, moderate) ──────────────────────────────────────────────
export const webhookLimiter = createRateLimiter({
  keyPrefix: "webhook",
  windowMs: 60_000,
  max: isProd ? 120 : 600,
  label: "webhook",
});

// ── Catalog RFQ ingest (strict) ──────────────────────────────────────────────
export const catalogRfqIngestLimiter = createRateLimiter({
  keyPrefix: "catalog-rfq-ingest",
  windowMs: 60_000,
  max: isProd ? 30 : 120, 
  label: "catalog-rfq-ingest",
});

// ── RFQ mutations ────────────────────────────────────────────────────────────
export const rfqMutationLimiter = createRateLimiter({
  keyPrefix: "rfq-mutation",
  windowMs: 15 * 60_000,
  max: isProd ? 500 : 1000,
  label: "rfq-mutation",
  keyFn: authenticatedOrIpKey,
});

// ── Contact (reserved path) ───────────────────────────────────────────────────
export const contactLimiter = createRateLimiter({
  keyPrefix: "contact",
  windowMs: 15 * 60_000,
  max: isProd ? 20 : 100,
  label: "contact",
});

const SOCKET_HANDSHAKE_MAX = isProd ? 30 : 500;

/** Socket handshake: Redis-backed, 30 connections / minute per IP. */
export function checkSocketHandshakeLimit(ip: string): boolean {
  // io.use is sync — use a pending flag; actual check is async in socket.ts
  void ip;
  return true;
}

export async function checkSocketHandshakeLimitAsync(ip: string): Promise<boolean> {
  try {
    return await checkRedisSocketHandshakeLimit(ip, SOCKET_HANDSHAKE_MAX);
  } catch {
    return false;
  }
}

// Re-export for typing compatibility
export type RateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => void;
