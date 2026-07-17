import { logger } from "../../../../config/logger.js";
import type { LegacyMessagingReadMode, LegacyMessagingSurface } from "./legacy-adapter.config.js";
import type { MismatchType } from "./legacy-adapter.types.js";

type CounterMap = Record<string, number>;

const counters: CounterMap = {};

function inc(key: string, labels: Record<string, string> = {}) {
  const labelKey = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  const full = labelKey ? `${key}{${labelKey}}` : key;
  counters[full] = (counters[full] ?? 0) + 1;
}

export function recordShadowReadStart(surface: LegacyMessagingSurface, readMode: LegacyMessagingReadMode) {
  inc("unified_messaging_shadow_read_total", { surface, readMode });
}

export function recordShadowReadSuccess(surface: LegacyMessagingSurface) {
  inc("unified_messaging_shadow_read_success_total", { surface });
}

export function recordShadowReadError(surface: LegacyMessagingSurface) {
  inc("unified_messaging_shadow_read_error_total", { surface });
}

export function recordShadowMismatch(surface: LegacyMessagingSurface, mismatchTypes: MismatchType[]) {
  inc("unified_messaging_shadow_mismatch_total", { surface });
  for (const mismatchType of mismatchTypes) {
    inc("unified_messaging_shadow_mismatch_total", { surface, mismatchType });
  }
}

export function recordLatency(
  metric: "unified_messaging_legacy_latency_ms" | "unified_messaging_unified_latency_ms" | "unified_messaging_shadow_latency_ms",
  surface: LegacyMessagingSurface,
  durationMs: number,
) {
  logger.debug({ metric, surface, durationMs }, "unified messaging latency");
}

export function recordFallback(surface: LegacyMessagingSurface) {
  inc("unified_messaging_fallback_total", { surface });
}

export function logShadowCompare(input: {
  surface: LegacyMessagingSurface;
  matched: boolean;
  mismatchTypes: MismatchType[];
  legacyCount: number;
  unifiedCount: number;
  durationMs: number;
}) {
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

export function getShadowMetricsSnapshot(): CounterMap {
  return { ...counters };
}

export function resetShadowMetricsForTests() {
  for (const key of Object.keys(counters)) delete counters[key];
}
