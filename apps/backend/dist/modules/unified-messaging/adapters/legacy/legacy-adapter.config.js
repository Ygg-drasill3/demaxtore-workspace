import { createHash } from "node:crypto";
import { env } from "../../../../config/env.js";
import { logger } from "../../../../config/logger.js";
const VALID_READ_MODES = new Set([
    "legacy",
    "shadow",
    "unified_fallback",
    "unified",
]);
export function parseReadMode(raw) {
    const value = (raw ?? "legacy").toLowerCase();
    if (!VALID_READ_MODES.has(value)) {
        logger.warn({ readMode: raw }, "Invalid UNIFIED_MESSAGING_READ_MODE — falling back to legacy");
        return "legacy";
    }
    return value;
}
export function getLegacyAdapterConfig() {
    const readMode = parseReadMode(env.UNIFIED_MESSAGING_READ_MODE);
    const adapterEnabled = env.UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED ?? false;
    const shadowReadEnabled = env.UNIFIED_MESSAGING_SHADOW_READ_ENABLED ?? false;
    const shadowTimeoutMs = env.UNIFIED_MESSAGING_SHADOW_TIMEOUT_MS ?? 1000;
    return {
        adapterEnabled,
        shadowReadEnabled,
        readMode,
        shadowTimeoutMs: Number.isFinite(shadowTimeoutMs) && shadowTimeoutMs > 0 ? shadowTimeoutMs : 1000,
        unifiedApiEnabled: env.UNIFIED_MESSAGING_ENABLED ?? false,
    };
}
export function shouldUseAdapterLayer() {
    const cfg = getLegacyAdapterConfig();
    return cfg.adapterEnabled || cfg.shadowReadEnabled || cfg.readMode !== "legacy";
}
export function hashId(value) {
    if (!value)
        return null;
    return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
//# sourceMappingURL=legacy-adapter.config.js.map