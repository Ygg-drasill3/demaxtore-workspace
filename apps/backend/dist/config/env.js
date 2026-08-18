// apps/backend/src/config/env.ts
// Centralised env loader. Fails fast on missing required vars.
import "dotenv/config";
import { z } from "zod";
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8001),
    DATABASE_URL: z.string().url(),
    /** Prisma connection pool size per process (Sprint 9B). */
    DATABASE_CONNECTION_LIMIT: z.coerce.number().int().positive().default(25),
    /** Seconds to wait for a pool connection before error. */
    DATABASE_POOL_TIMEOUT_SEC: z.coerce.number().int().positive().default(20),
    /** RUNNING jobs older than this are reconciled to FAILED. */
    JOB_STALE_RUNNING_MS: z.coerce.number().int().positive().default(30 * 60_000),
    JOB_RECONCILE_INTERVAL_MS: z.coerce.number().int().positive().default(10 * 60_000),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65_000),
    HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().int().positive().default(66_000),
    HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be ≥32 chars"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be ≥32 chars"),
    COOKIE_DOMAIN: z.string().default("localhost"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    STORAGE_DIR: z.string().default("./.data/uploads"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(15 * 60), // 15 min
    REFRESH_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(7 * 24 * 60 * 60), // 7 d
    PASSWORDLESS_ACCESS_DEFAULT_TTL_MIN: z.coerce.number().int().positive().default(30),
    PASSWORDLESS_ACCESS_SECRET: z.string().min(32).optional(),
    WHATSAPP_BRIDGE_ENABLED: z.coerce.boolean().default(true),
    WHATSAPP_BRIDGE_PROVIDER: z.enum(["meta_cloud", "twilio", "dialog360"]).default("meta_cloud"),
    WHATSAPP_BRIDGE_RETRY_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    EMAIL_BRIDGE_ENABLED: z.coerce.boolean().default(true),
    EMAIL_BRIDGE_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_BRIDGE_RETRY_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    EMAIL_BRIDGE_OPEN_TRACKING_ENABLED: z.coerce.boolean().default(true),
    /** Public backend origin for email open-tracking pixels (must reach /api). */
    API_PUBLIC_BASE_URL: z.string().default("http://localhost:3001"),
    // ── Messaging & Delivery (Sprint 2.9) ─────────────────────────────────────
    OUTBOUND_MESSAGING_ENABLED: z.coerce.boolean().default(true),
    EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
    EMAIL_FROM: z.string().default("DeMaxtore <no-reply@mail.demaxtore.com>"),
    EMAIL_REPLY_TO: z.string().default("ops@mail.demaxtore.com"),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.coerce.boolean().default(false),
    APP_BASE_URL: z.string().default("http://localhost:3000"),
    SLA_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(15 * 60_000),
    // ── Maritime tracking (Sprint 4B) ─────────────────────────────────────────
    TRACKING_PROVIDER: z.enum(["manual", "mock_live", "maritime_api"]).default("manual"),
    TRACKING_API_KEY: z.string().optional(),
    TRACKING_BASE_URL: z.string().optional(),
    TRACKING_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60_000),
    TRACKING_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),
    TRACKING_HTTP_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    /** Dev: exclude E2E/test workspaces from Control Tower counts and scans. Set false to include all. */
    CONTROL_TOWER_EXCLUDE_TEST_DATA: z.coerce.boolean().optional(),
    // ── Customs auto-seed FX defaults ─────────────────────────────────────────
    // Only used when customs clearance auto-seeds a duty/tax and landed cost
    // calculation. Written as SYSTEM_CONFIGURED so the broker can see the rate was
    // not hand-verified and override it with the official rate.
    CUSTOMS_DEFAULT_USD_TRY_RATE: z.coerce.number().positive().default(34),
    CUSTOMS_DEFAULT_USD_EUR_RATE: z.coerce.number().positive().default(1.08),
    // ── Object storage (Sprint C3) ─────────────────────────────────────────────
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("eu-west-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    // ── Socket.io scale (Sprint D) ─────────────────────────────────────────────
    SOCKET_ADAPTER: z.enum(["memory", "redis"]).default("memory"),
    REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
    SENTRY_DSN: z.string().optional(),
    APP_VERSION: z.string().default("0.2.0"),
    // ── External panel SSO bridges ───────────────────────────────────────────────
    WORKSPACE_BRIDGE_SECRET: z.string().optional(),
    FREIGHTIQ_PANEL_URL: z.string().default("https://freightiq.demaxtore.com"),
    FREIGHTIQ_API_URL: z.string().default("http://127.0.0.1:8000"),
    COMMODITYBID_PANEL_URL: z.string().default("https://commoditybid.demaxtore.com"),
    COMMODITYBID_CREATE_PATH: z.string().optional(),
    COMMODITYBID_API_URL: z.string().optional(),
    CATALOG_RFQ_INGEST_TOKEN: z.string().optional(),
    // ── Faz 1 webhooks ──────────────────────────────────────────────────────────
    PAYMENT_WEBHOOK_SECRET: z.string().optional(),
    PAYMENT_WEBHOOK_ENFORCE_HMAC: z.coerce.boolean().optional(),
    CARRIER_WEBHOOK_SECRET: z.string().optional(),
    CARRIER_WEBHOOK_ENFORCE_HMAC: z.coerce.boolean().optional(),
    // ── Faz 2 orchestrator ──────────────────────────────────────────────────────
    FSM_ORCHESTRATOR_ENABLED: z.coerce.boolean().optional(),
    FSM_ORCHESTRATOR_SHADOW_MODE: z.coerce.boolean().optional(),
    FSM_ORCHESTRATOR_AUTO_APPLY: z.coerce.boolean().optional(),
    // ── Online payment collection (PAY-001) ─────────────────────────────────────
    /** When true with a non-stub PAYMENT_PROVIDER, online intents are allowed. */
    ONLINE_PAYMENTS_ENABLED: z.coerce.boolean().optional(),
    PAYMENT_PROVIDER: z.enum(["stub", "stripe"]).default("stub"),
    // ── Faz 3–6 feature flags ───────────────────────────────────────────────────
    PAYMENT_GATES_ENABLED: z.coerce.boolean().optional(),
    CARRIER_AUTO_TRANSITION_ENABLED: z.coerce.boolean().optional(),
    INCOTERMS_PRECONDITIONS_ENABLED: z.coerce.boolean().optional(),
    EXCEPTION_ENGINE_V2_ENABLED: z.coerce.boolean().optional(),
    RBAC_EXPANDED_ROLES_ENABLED: z.coerce.boolean().optional(),
    UNIFIED_MESSAGING_ENABLED: z.coerce.boolean().optional(),
    UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED: z.coerce.boolean().optional(),
    UNIFIED_MESSAGING_SHADOW_READ_ENABLED: z.coerce.boolean().optional(),
    UNIFIED_MESSAGING_READ_MODE: z.string().optional(),
    UNIFIED_MESSAGING_SHADOW_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    UNIFIED_MESSAGING_WRITE_MODE: z.string().optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    /** Meta app ID for Embedded Signup (BYOWA). */
    WHATSAPP_APP_ID: z.string().optional(),
    /** Meta Embedded Signup configuration ID from Business Manager. */
    WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: z.string().optional(),
    /** AES master key for encrypting tenant WhatsApp tokens at rest (≥32 chars). Falls back to JWT_SECRET in dev. */
    ENCRYPTION_MASTER_KEY: z.string().min(32).optional(),
    /** Dedicated key for WhatsApp connection token encryption — required in production. */
    WHATSAPP_CONNECTION_ENCRYPTION_KEY: z.string().min(32).optional(),
    /** shared = platform DeMaxtore number; buyer_connection = per-buyer BYOWA (no silent fallback). */
    WHATSAPP_SENDER_MODE: z.enum(["shared", "buyer_connection"]).default("shared"),
    /** E.164 digits of the DeMaxtore business WhatsApp line — blocked as outbound recipient. */
    WHATSAPP_BUSINESS_PHONE_E164: z.string().optional(),
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_APP_SECRET: z.string().optional(),
    WHATSAPP_API_VERSION: z.string().default("v21.0"),
    /** Approved Meta template for RFQ cold outreach (body vars: ref, message). */
    WHATSAPP_RFQ_TEMPLATE_NAME: z.string().optional(),
    WHATSAPP_RFQ_TEMPLATE_LANGUAGE: z.string().default("en"),
    // ── Google OAuth (optional) ─────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // ── Catalog product images (RFQ line items) ─────────────────────────────────
    CATALOG_FALLBACK_JSON_PATH: z.string().optional(),
    DEMAXTORE_CATALOG_API_URL: z.string().optional(),
    /** Server-side E2E bypass — requests must send X-E2E-Test-Secret matching this value. */
    E2E_TEST_SECRET: z.string().min(32).optional(),
});
const ProdSecretSchema = z.object({
    WORKSPACE_BRIDGE_SECRET: z.string().min(32),
    CATALOG_RFQ_INGEST_TOKEN: z.string().min(32),
    WHATSAPP_APP_SECRET: z.string().min(32),
    WHATSAPP_CONNECTION_ENCRYPTION_KEY: z.string().min(32),
    REDIS_URL: z.string().min(1),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("✗ Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
if (parsed.data.NODE_ENV === "production") {
    const prodCheck = ProdSecretSchema.safeParse(parsed.data);
    if (!prodCheck.success) {
        console.error("✗ Production secrets missing or too short:", prodCheck.error.flatten().fieldErrors);
        process.exit(1);
    }
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
/** Unified messaging API — default off in production until Phase 8 rollout. */
export function isUnifiedMessagingEnabled() {
    if (env.UNIFIED_MESSAGING_ENABLED !== undefined)
        return env.UNIFIED_MESSAGING_ENABLED;
    return env.NODE_ENV !== "production";
}
const VALID_WRITE_MODES = new Set([
    "legacy_only",
    "legacy_primary_unified_mirror",
    "unified_primary_legacy_mirror",
    "unified_only",
]);
export function getUnifiedMessagingWriteMode() {
    const raw = (env.UNIFIED_MESSAGING_WRITE_MODE ?? "legacy_only").toLowerCase();
    if (!VALID_WRITE_MODES.has(raw)) {
        return "legacy_only";
    }
    return raw;
}
export function passwordlessAccessSecret() {
    return env.PASSWORDLESS_ACCESS_SECRET ?? env.JWT_SECRET;
}
export function getWhatsAppSenderMode() {
    return env.WHATSAPP_SENDER_MODE;
}
export function isBuyerConnectionWhatsAppMode() {
    return getWhatsAppSenderMode() === "buyer_connection";
}
/** CORS origins — workspace app + embedded external panels (FreightIQ, CommodityBid). */
export const corsOrigins = [
    ...new Set([
        ...env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
        env.FREIGHTIQ_PANEL_URL.replace(/\/$/, ""),
        env.COMMODITYBID_PANEL_URL.replace(/\/$/, ""),
    ].filter(Boolean)),
];
//# sourceMappingURL=env.js.map