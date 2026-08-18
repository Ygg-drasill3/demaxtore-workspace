import { isProd } from "../config/env.js";
import { authenticatedOrIpKey, createRedisRateLimiter, checkRedisSocketHandshakeLimit, refreshCookieKey, submittedEmailKey, } from "./redis-rate-limit.js";
/**
 * Credential endpoints charge only *failed* attempts (see `countFailuresOnly`), so this
 * budget tracks brute-force pressure rather than login volume. That is what lets it be
 * this tight without throttling legitimate users or a test suite that logs in repeatedly
 * from one IP — the previous volume-based counter had to be raised to 1000 to avoid that.
 */
const FAILED_LOGIN_MAX_PER_IP = parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? (isProd ? "20" : "300"), 10);
/**
 * Second bucket keyed by the submitted email so a distributed attempt against one account
 * is capped even when the source IPs rotate.
 */
const FAILED_LOGIN_MAX_PER_IDENTITY = parseInt(process.env.LOGIN_IDENTITY_RATE_LIMIT_MAX ?? (isProd ? "10" : "300"), 10);
/**
 * Telemetry is a high-frequency, low-value write from an already-authenticated SPA
 * (guided tours alone emit an event per step), so it must not share the credential
 * budget — doing so meant tightening login would start dropping telemetry.
 */
const TELEMETRY_MAX = parseInt(process.env.TELEMETRY_RATE_LIMIT_MAX ?? (isProd ? "1000" : "2000"), 10);
/** Redis-backed rate limiter — required for all environments (REDIS_URL must be set). */
export function createRateLimiter(opts) {
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
    max: FAILED_LOGIN_MAX_PER_IP,
    label: "auth-login",
    countFailuresOnly: true,
});
export const loginIdentityLimiter = createRateLimiter({
    keyPrefix: "auth-login-identity",
    windowMs: 15 * 60_000,
    max: FAILED_LOGIN_MAX_PER_IDENTITY,
    label: "auth-login-identity",
    countFailuresOnly: true,
    keyFn: submittedEmailKey,
});
export const forgotBurstLimiter = createRateLimiter({
    keyPrefix: "auth-forgot",
    windowMs: 15 * 60_000,
    max: 50,
    label: "auth-forgot",
});
// Token-guessing surfaces: a legitimate holder of the token succeeds first try, so the
// budget only ever accumulates from wrong tokens.
export const resetBurstLimiter = createRateLimiter({
    keyPrefix: "auth-reset",
    windowMs: 15 * 60_000,
    max: isProd ? 20 : 300,
    label: "auth-reset",
    countFailuresOnly: true,
});
export const consumeBurstLimiter = createRateLimiter({
    keyPrefix: "passwordless-consume",
    windowMs: 15 * 60_000,
    max: isProd ? 20 : 300,
    label: "passwordless-consume",
    countFailuresOnly: true,
});
/**
 * Creating passwordless links is an authenticated staff action that mints credentials and
 * sends mail, so it needs a volume cap of its own — it previously borrowed the login
 * bucket, which now only counts failures and would not have limited it at all.
 */
export const passwordlessLinkLimiter = createRateLimiter({
    keyPrefix: "passwordless-link",
    windowMs: 15 * 60_000,
    max: isProd ? 60 : 300,
    label: "passwordless-link",
    keyFn: authenticatedOrIpKey,
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
    max: TELEMETRY_MAX,
    label: "telemetry",
});
/**
 * Uploads consume disk, which is the one resource an authenticated user can exhaust
 * irreversibly — and `apiGlobalLimiter` skips authenticated traffic, so these routes were
 * uncapped. Budget is per user and well above real document workloads.
 */
export const uploadLimiter = createRateLimiter({
    keyPrefix: "upload",
    windowMs: 15 * 60_000,
    max: isProd ? 200 : 1000,
    label: "upload",
    keyFn: authenticatedOrIpKey,
});
/** Duty/tax calculation is compute-heavy and callable at will by any authenticated buyer. */
export const dutyTaxCalcLimiter = createRateLimiter({
    keyPrefix: "duty-tax-calc",
    windowMs: 15 * 60_000,
    max: isProd ? 300 : 1000,
    label: "duty-tax-calc",
    keyFn: authenticatedOrIpKey,
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
export function checkSocketHandshakeLimit(ip) {
    // io.use is sync — use a pending flag; actual check is async in socket.ts
    void ip;
    return true;
}
export async function checkSocketHandshakeLimitAsync(ip) {
    try {
        return await checkRedisSocketHandshakeLimit(ip, SOCKET_HANDSHAKE_MAX);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=rate-limit.js.map