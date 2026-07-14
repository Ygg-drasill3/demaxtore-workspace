// apps/frontend/src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Hard-required env vars for axios + socket clients during tests.
Object.assign(import.meta, {
  env: {
    VITE_API_URL:    "http://test.local/api",
    VITE_SOCKET_URL: "http://test.local",
    MODE: "test",
    DEV: false,
    PROD: false,
  },
});

// Mock socket.io-client globally — no real network in unit tests.
vi.mock("socket.io-client", () => {
  const handlers: Record<string, Set<(p: unknown) => void>> = {};
  const socket = {
    on:        (e: string, fn: (p: unknown) => void) => { (handlers[e] ??= new Set()).add(fn); return socket; },
    off:       (e: string, fn: (p: unknown) => void) => { handlers[e]?.delete(fn); return socket; },
    emit:      vi.fn(),
    connect:   vi.fn(),
    disconnect:vi.fn(),
    // socket.io-client exposes a `.io` manager; getSocket() registers a
    // "reconnect_attempt" handler on it. The unit-test mock must provide it.
    io:        { on: vi.fn(), off: vi.fn() },
    __emit:    (e: string, p: unknown) => handlers[e]?.forEach((fn) => fn(p)),
  };
  return { io: () => socket };
});

// Window.crypto polyfill for jsdom (idempotency keys, toast ids)
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-" + Math.random().toString(36).slice(2) },
  });
}

// Prefer reduced motion in unit tests — deterministic, no rAF loops.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
