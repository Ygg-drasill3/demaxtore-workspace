// Structured security / audit logging — no secrets in payloads.
import { logger } from "../config/logger.js";
export function logSecurityEvent(event, meta = {}) {
    logger.info({ audit: "security", event, ...meta }, `[security] ${event}`);
}
export function logAuthEvent(action, meta) {
    logSecurityEvent(`auth.${action}`, meta);
}
export function logRfqIngestEvent(ok, meta) {
    logSecurityEvent(ok ? "rfq.ingest" : "rfq.ingest_failed", meta);
}
export function logWorkspaceBridgeEvent(meta) {
    logSecurityEvent("workspace.bridge", meta);
}
//# sourceMappingURL=security-audit.js.map