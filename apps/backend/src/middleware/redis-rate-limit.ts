// Redis-backed sliding-window rate limiter (multi-instance safe).
import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { redisIncrWindow, redisUrl, redisWindowCount } from "../lib/redis.js";
import { logSecurityEvent } from "../lib/security-audit.js";
import { logger } from "../config/logger.js";
import { isValidE2eBypass } from "./e2e-bypass.js";

export interface RedisRateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  /** Human-readable label for audit logs */
  label?: string;
  /** Bucket key — defaults to client IP */
  keyFn?: (req: Request) => string;
  /** Skip counting when a valid access bearer token is present (SPA session traffic). */
  skipIfAuthenticated?: boolean;
  /**
   * Charge the budget only for responses that failed (>=400), so legitimate traffic never
   * consumes it. Lets credential endpoints run a tight budget that tracks brute-force
   * attempts rather than total volume.
   */
  countFailuresOnly?: boolean;
}

export function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string"
    ? forwarded.split(",")[0]!.trim()
    : req.ip ?? "unknown";
  return ip;
}

export function hasAccessBearer(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const decoded = jwt.decode(header.slice(7).trim()) as { sub?: string; type?: string } | null;
  return !!(decoded?.sub && decoded.type === "access");
}

/** Per-user buckets for authenticated SPA traffic; IP fallback for anonymous. */
export function authenticatedOrIpKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const decoded = jwt.decode(header.slice(7).trim()) as { sub?: string; type?: string } | null;
    if (decoded?.sub && decoded.type === "access") {
      return `user:${decoded.sub}`;
    }
  }
  return `ip:${clientKey(req)}`;
}

/**
 * Login endpoints — bucket by the submitted email so one account cannot be ground down
 * from rotating IPs. Falls back to the IP bucket when no usable email was supplied.
 */
export function submittedEmailKey(req: Request): string {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof email !== "string" || !email.includes("@")) return `ip:${clientKey(req)}`;
  return `email:${email.trim().toLowerCase()}`;
}

/** Refresh endpoint — bucket by refresh cookie subject so SPA hydrate is not IP-throttled. */
export function refreshCookieKey(req: Request): string {
  const fromParser = (req as Request & { cookies?: Record<string, string> }).cookies?.dmx_refresh;
  const raw =
    fromParser ??
    (typeof req.headers.cookie === "string"
      ? req.headers.cookie.match(/(?:^|;\s*)dmx_refresh=([^;]+)/)?.[1]
      : undefined);
  if (!raw) return `ip:${clientKey(req)}`;
  const decoded = jwt.decode(decodeURIComponent(raw)) as { sub?: string; jti?: string } | null;
  if (decoded?.sub) return `refresh:${decoded.sub}:${decoded.jti ?? "legacy"}`;
  return `ip:${clientKey(req)}`;
}

export function createRedisRateLimiter(opts: RedisRateLimitOptions): RequestHandler {
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));

  return (req, res, next) => {
    if (isValidE2eBypass(req)) {
      next();
      return;
    }
    if (opts.skipIfAuthenticated && hasAccessBearer(req)) {
      next();
      return;
    }

    if (!redisUrl()) {
      logger.error({ prefix: opts.keyPrefix }, "rate_limit.redis_missing");
      res.status(503).json({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Service unavailable" } });
      return;
    }

    const identity = opts.keyFn?.(req) ?? clientKey(req);
    const key = `rl:${opts.keyPrefix}:${identity}`;

    const reject = () => {
      logSecurityEvent("rate_limit.exceeded", {
        prefix: opts.keyPrefix,
        label: opts.label ?? opts.keyPrefix,
        ip: clientKey(req),
        requestId: req.requestId,
      });
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    };
    const unavailable = (err: unknown) => {
      logger.error({ err, prefix: opts.keyPrefix }, "rate_limit.redis_error");
      res.status(503).json({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "Service unavailable" } });
    };

    if (opts.countFailuresOnly) {
      void redisWindowCount(key)
        .then((failures) => {
          res.setHeader("X-RateLimit-Limit", String(opts.max));
          res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.max - failures)));
          if (failures >= opts.max) {
            reject();
            return;
          }
          res.on("finish", () => {
            if (res.statusCode < 400) return;
            void redisIncrWindow(key, windowSec).catch((err) => {
              logger.error({ err, prefix: opts.keyPrefix }, "rate_limit.redis_error");
            });
          });
          next();
        })
        .catch(unavailable);
      return;
    }

    void redisIncrWindow(key, windowSec)
      .then((count) => {
        res.setHeader("X-RateLimit-Limit", String(opts.max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.max - count)));
        if (count > opts.max) {
          reject();
          return;
        }
        next();
      })
      .catch(unavailable);
  };
}

/** Socket handshake limit via Redis (sync wrapper for io.use). */
export async function checkRedisSocketHandshakeLimit(ip: string, max: number): Promise<boolean> {
  if (!redisUrl()) return false;
  const count = await redisIncrWindow(`rl:socket-handshake:${ip}`, 60);
  return count <= max;
}
