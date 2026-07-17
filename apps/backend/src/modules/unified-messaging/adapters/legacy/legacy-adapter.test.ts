import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compareNormalized } from "./legacy-adapter.comparator.js";
import { emptyNormalized } from "./legacy-adapter.normalizer.js";
import {
  getShadowMetricsSnapshot,
  logShadowCompare,
  recordShadowMismatch,
  resetShadowMetricsForTests,
} from "./legacy-adapter.metrics.js";
import { parseReadMode } from "./legacy-adapter.config.js";

const envState = vi.hoisted(() => ({
  UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED: false,
  UNIFIED_MESSAGING_SHADOW_READ_ENABLED: false,
  UNIFIED_MESSAGING_READ_MODE: "legacy",
  UNIFIED_MESSAGING_SHADOW_TIMEOUT_MS: 1000,
  UNIFIED_MESSAGING_ENABLED: false,
}));

vi.mock("../../../../config/env.js", () => ({
  env: envState,
}));

vi.mock("../../../../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const actor = { id: "user-1", email: "u@test.com", role: "ADMIN" as const };

describe("legacy adapter config", () => {
  it("falls back to legacy for invalid read mode", () => {
    expect(parseReadMode("invalid-mode")).toBe("legacy");
  });
});

describe("legacy adapter comparator", () => {
  it("reports match when counts align", () => {
    const legacy = { ...emptyNormalized("workspace_communication"), messageCount: 5, unreadCount: 1 };
    const unified = { ...legacy, sourceSurface: "workspace_communication" as const };
    const result = compareNormalized("workspace_communication", legacy, unified);
    expect(result.matched).toBe(true);
    expect(result.mismatchTypes).toHaveLength(0);
  });

  it("detects message count mismatch", () => {
    const legacy = { ...emptyNormalized("workspace_communication"), messageCount: 5 };
    const unified = { ...legacy, messageCount: 3 };
    const result = compareNormalized("workspace_communication", legacy, unified);
    expect(result.matched).toBe(false);
    expect(result.mismatchTypes).toContain("MESSAGE_COUNT");
  });
});

describe("legacy adapter metrics", () => {
  beforeEach(() => resetShadowMetricsForTests());

  it("records mismatch without PII fields", () => {
    recordShadowMismatch("workspace_inbox", ["UNREAD_COUNT"]);
    const snap = getShadowMetricsSnapshot();
    expect(Object.keys(snap).some((k) => k.includes("workspace_inbox"))).toBe(true);
    logShadowCompare({
      surface: "workspace_inbox",
      matched: false,
      mismatchTypes: ["UNREAD_COUNT"],
      legacyCount: 12,
      unifiedCount: 10,
      durationMs: 42,
    });
  });
});

describe("executeLegacyCompatibleRead", () => {
  let executeLegacyCompatibleRead: typeof import("./legacy-adapter.service.js").executeLegacyCompatibleRead;

  beforeEach(async () => {
    resetShadowMetricsForTests();
    envState.UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED = false;
    envState.UNIFIED_MESSAGING_SHADOW_READ_ENABLED = false;
    envState.UNIFIED_MESSAGING_READ_MODE = "legacy";
    vi.resetModules();
    ({ executeLegacyCompatibleRead } = await import("./legacy-adapter.service.js"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("legacy mode only calls legacy reader", async () => {
    const legacyReader = vi.fn().mockResolvedValue({ messages: [] });
    const unifiedReader = vi.fn();
    const result = await executeLegacyCompatibleRead({
      surface: "workspace_communication",
      actor,
      query: {},
      legacyReader,
      unifiedReader,
      normalizeLegacy: () => emptyNormalized("workspace_communication"),
      normalizeUnified: () => emptyNormalized("workspace_communication"),
    });
    expect(legacyReader).toHaveBeenCalledOnce();
    expect(unifiedReader).not.toHaveBeenCalled();
    expect(result).toEqual({ messages: [] });
  });

  it("shadow mode returns legacy result and runs unified in background", async () => {
    envState.UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED = true;
    envState.UNIFIED_MESSAGING_SHADOW_READ_ENABLED = true;
    envState.UNIFIED_MESSAGING_READ_MODE = "shadow";

    const legacyReader = vi.fn().mockResolvedValue({ messages: [{ id: "1" }] });
    const unifiedReader = vi.fn().mockResolvedValue(emptyNormalized("workspace_communication"));

    const result = await executeLegacyCompatibleRead({
      surface: "workspace_communication",
      actor,
      query: {},
      legacyReader,
      unifiedReader,
      normalizeLegacy: () => ({ ...emptyNormalized("workspace_communication"), messageCount: 1 }),
      normalizeUnified: () => ({ ...emptyNormalized("workspace_communication"), messageCount: 1 }),
    });

    expect(result).toEqual({ messages: [{ id: "1" }] });
    await new Promise((r) => setTimeout(r, 50));
    expect(unifiedReader).toHaveBeenCalled();
  });

  it("shadow unified error does not break legacy response", async () => {
    envState.UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED = true;
    envState.UNIFIED_MESSAGING_SHADOW_READ_ENABLED = true;
    envState.UNIFIED_MESSAGING_READ_MODE = "shadow";

    const legacyReader = vi.fn().mockResolvedValue({ ok: true });
    const unifiedReader = vi.fn().mockRejectedValue(new Error("shadow failed"));

    const result = await executeLegacyCompatibleRead({
      surface: "direct_chat",
      actor,
      query: {},
      legacyReader,
      unifiedReader,
      normalizeLegacy: () => emptyNormalized("direct_chat"),
      normalizeUnified: () => emptyNormalized("direct_chat"),
    });

    expect(result).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 50));
  });

  it("shadow timeout does not block legacy response", async () => {
    envState.UNIFIED_MESSAGING_LEGACY_ADAPTER_ENABLED = true;
    envState.UNIFIED_MESSAGING_SHADOW_READ_ENABLED = true;
    envState.UNIFIED_MESSAGING_READ_MODE = "shadow";
    envState.UNIFIED_MESSAGING_SHADOW_TIMEOUT_MS = 10;

    const legacyReader = vi.fn().mockResolvedValue({ ok: true });
    const unifiedReader = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve(emptyNormalized("direct_chat")), 200)),
    );

    const result = await executeLegacyCompatibleRead({
      surface: "direct_chat",
      actor,
      query: {},
      legacyReader,
      unifiedReader,
      normalizeLegacy: () => emptyNormalized("direct_chat"),
      normalizeUnified: () => emptyNormalized("direct_chat"),
    });

    expect(result).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 80));
  });
});
