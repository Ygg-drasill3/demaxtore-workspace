// Structured security / audit logging — no secrets in payloads.
import { logger } from "../config/logger.js";

export type SecurityEvent =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_reset"
  | "rfq.ingest"
  | "rfq.ingest_failed"
  | "webhook.whatsapp"
  | "webhook.whatsapp_failed"
  | "workspace.bridge"
  | "upload.rejected"
  | "rate_limit.exceeded";

export function logSecurityEvent(
  event: SecurityEvent,
  meta: Record<string, unknown> = {},
): void {
  logger.info({ audit: "security", event, ...meta }, `[security] ${event}`);
}

export function logAuthEvent(
  action: "login" | "login_failed" | "logout" | "password_reset",
  meta: Record<string, unknown>,
): void {
  logSecurityEvent(`auth.${action}` as SecurityEvent, meta);
}

export function logRfqIngestEvent(
  ok: boolean,
  meta: Record<string, unknown>,
): void {
  logSecurityEvent(ok ? "rfq.ingest" : "rfq.ingest_failed", meta);
}

export function logWorkspaceBridgeEvent(meta: Record<string, unknown>): void {
  logSecurityEvent("workspace.bridge", meta);
}
