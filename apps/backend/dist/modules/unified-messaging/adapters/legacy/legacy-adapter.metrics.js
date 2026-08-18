import { logger } from "../../../../config/logger.js";
const counters = {};
function inc(key, labels = {}) {
    const labelKey = Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
    const full = labelKey ? `${key}{${labelKey}}` : key;
    counters[full] = (counters[full] ?? 0) + 1;
}
export function recordShadowReadStart(surface, readMode) {
    inc("unified_messaging_shadow_read_total", { surface, readMode });
}
export function recordShadowReadSuccess(surface) {
    inc("unified_messaging_shadow_read_success_total", { surface });
}
export function recordShadowReadError(surface) {
    inc("unified_messaging_shadow_read_error_total", { surface });
}
export function recordShadowMismatch(surface, mismatchTypes) {
    inc("unified_messaging_shadow_mismatch_total", { surface });
    for (const mismatchType of mismatchTypes) {
        inc("unified_messaging_shadow_mismatch_total", { surface, mismatchType });
    }
}
export function recordLatency(metric, surface, durationMs) {
    logger.debug({ metric, surface, durationMs }, "unified messaging latency");
}
export function recordFallback(surface) {
    inc("unified_messaging_fallback_total", { surface });
}
export function logShadowCompare(input) {
    logger.info({
        event: "unified_messaging_shadow_compare",
        surface: input.surface,
        matched: input.matched,
        mismatchTypes: input.mismatchTypes,
        legacyCount: input.legacyCount,
        unifiedCount: input.unifiedCount,
        durationMs: input.durationMs,
    });
}
export function getShadowMetricsSnapshot() {
    return { ...counters };
}
export function resetShadowMetricsForTests() {
    for (const key of Object.keys(counters))
        delete counters[key];
}
//# sourceMappingURL=legacy-adapter.metrics.js.map