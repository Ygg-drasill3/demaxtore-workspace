// apps/backend/src/config/env.ts
// Centralised env loader. Fails fast on missing required vars.
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV:           z.enum(["development", "test", "production"]).default("development"),
  PORT:               z.coerce.number().int().positive().default(8001),
  DATABASE_URL:       z.string().url(),
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
  JWT_SECRET:         z.string().min(32, "JWT_SECRET must be ≥32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be ≥32 chars"),
  COOKIE_DOMAIN:      z.string().default("localhost"),
  CORS_ORIGIN:        z.string().default("http://localhost:3000"),
  STORAGE_DIR:        z.string().default("./.data/uploads"),
  LOG_LEVEL:          z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  ACCESS_TOKEN_TTL_SEC:  z.coerce.number().int().positive().default(15 * 60),         // 15 min
  REFRESH_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(7 * 24 * 60 * 60), // 7 d

  // ── Messaging & Delivery (Sprint 2.9) ─────────────────────────────────────
  EMAIL_PROVIDER:    z.enum(["console", "resend", "smtp"]).default("console"),
  EMAIL_FROM:        z.string().default("DeMaxtore <no-reply@mail.demaxtore.com>"),
  EMAIL_REPLY_TO:    z.string().default("ops@mail.demaxtore.com"),
  RESEND_API_KEY:    z.string().optional(),
  SMTP_HOST:         z.string().optional(),
  SMTP_PORT:         z.coerce.number().int().positive().default(587),
  SMTP_USER:         z.string().optional(),
  SMTP_PASS:         z.string().optional(),
  SMTP_SECURE:       z.coerce.boolean().default(false),
  APP_BASE_URL:      z.string().default("http://localhost:3000"),
  SLA_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(15 * 60_000),

  // ── Maritime tracking (Sprint 4B) ─────────────────────────────────────────
  TRACKING_PROVIDER:     z.enum(["manual", "mock_live", "maritime_api"]).default("manual"),
  TRACKING_API_KEY:      z.string().optional(),
  TRACKING_BASE_URL:     z.string().optional(),
  TRACKING_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60_000),
  TRACKING_HTTP_TIMEOUT_MS:  z.coerce.number().int().positive().default(12_000),
  TRACKING_HTTP_RETRIES:     z.coerce.number().int().min(0).max(5).default(2),

  /** Dev: exclude E2E/test workspaces from Control Tower counts and scans. Set false to include all. */
  CONTROL_TOWER_EXCLUDE_TEST_DATA: z.coerce.boolean().optional(),

  // ── Object storage (Sprint C3) ─────────────────────────────────────────────
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET:        z.string().optional(),
  S3_REGION:        z.string().default("eu-west-1"),
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // ── Socket.io scale (Sprint D) ─────────────────────────────────────────────
  SOCKET_ADAPTER: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL:      z.string().optional(),

  // ── External panel SSO bridges ───────────────────────────────────────────────
  WORKSPACE_BRIDGE_SECRET: z.string().optional(),
  FREIGHTIQ_PANEL_URL:     z.string().default("https://freightiq.demaxtore.com"),
  FREIGHTIQ_API_URL:       z.string().default("http://127.0.0.1:8000"),
  COMMODITYBID_PANEL_URL:  z.string().default("https://commoditybid.demaxtore.com"),
  CATALOG_RFQ_INGEST_TOKEN: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("✗ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/** CORS origins split on comma; first is canonical. */
export const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
