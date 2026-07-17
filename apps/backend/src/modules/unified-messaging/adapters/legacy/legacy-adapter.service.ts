import { getLegacyAdapterConfig } from "./legacy-adapter.config.js";
import { compareNormalized } from "./legacy-adapter.comparator.js";
import {
  logShadowCompare,
  recordFallback,
  recordLatency,
  recordShadowMismatch,
  recordShadowReadError,
  recordShadowReadStart,
  recordShadowReadSuccess,
} from "./legacy-adapter.metrics.js";
import type { LegacyCompatibleReadInput } from "./legacy-adapter.types.js";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SHADOW_TIMEOUT")), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function executeLegacyCompatibleRead<TLegacyQuery, TLegacyResponse, TUnifiedResult>(
  input: LegacyCompatibleReadInput<TLegacyQuery, TLegacyResponse, TUnifiedResult>,
): Promise<TLegacyResponse> {
  const cfg = getLegacyAdapterConfig();

  if (!cfg.adapterEnabled && cfg.readMode === "legacy") {
    return input.legacyReader();
  }

  if (cfg.readMode === "unified") {
    if (input.unifiedReader && input.unifiedToLegacyMapper) {
      try {
        const unifiedResult = await withTimeout(input.unifiedReader(), cfg.shadowTimeoutMs);
        return input.unifiedToLegacyMapper(unifiedResult);
      } catch {
        recordFallback(input.surface);
        return input.legacyReader();
      }
    }
    return input.legacyReader();
  }

  if (cfg.readMode === "unified_fallback") {
    if (input.unifiedReader && input.unifiedToLegacyMapper) {
      try {
        const unifiedResult = await withTimeout(input.unifiedReader(), cfg.shadowTimeoutMs);
        return input.unifiedToLegacyMapper(unifiedResult);
      } catch {
        recordFallback(input.surface);
        return input.legacyReader();
      }
    }
    return input.legacyReader();
  }

  const legacyStarted = Date.now();
  const legacyResult = await input.legacyReader();
  recordLatency("unified_messaging_legacy_latency_ms", input.surface, Date.now() - legacyStarted);

  const shouldShadow =
    cfg.shadowReadEnabled &&
    cfg.readMode === "shadow" &&
    input.unifiedReader &&
    input.normalizeUnified;

  if (!shouldShadow) {
    return legacyResult;
  }

  void runShadowCompare(input, legacyResult, cfg.shadowTimeoutMs).catch(() => {
    /* errors already logged */
  });

  return legacyResult;
}

async function runShadowCompare<TLegacyResponse, TUnifiedResult>(
  input: LegacyCompatibleReadInput<unknown, TLegacyResponse, TUnifiedResult>,
  legacyResult: TLegacyResponse,
  timeoutMs: number,
) {
  const cfg = getLegacyAdapterConfig();
  recordShadowReadStart(input.surface, cfg.readMode);

  const unifiedStarted = Date.now();
  try {
    const unifiedResult = await withTimeout(input.unifiedReader!(), timeoutMs);
    recordLatency("unified_messaging_unified_latency_ms", input.surface, Date.now() - unifiedStarted);

    const legacyNorm = input.normalizeLegacy(legacyResult);
    const unifiedNorm = input.normalizeUnified!(unifiedResult);
    const comparison = compareNormalized(input.surface, legacyNorm, unifiedNorm);

    logShadowCompare({
      surface: input.surface,
      matched: comparison.matched,
      mismatchTypes: comparison.mismatchTypes,
      legacyCount: legacyNorm.messageCount,
      unifiedCount: unifiedNorm.messageCount,
      durationMs: comparison.durationMs,
    });

    if (!comparison.matched) {
      recordShadowMismatch(input.surface, comparison.mismatchTypes);
    } else {
      recordShadowReadSuccess(input.surface);
    }
  } catch {
    recordShadowReadError(input.surface);
  }
}
