import { VIEWPORT_INSETS } from "./motionTokens";
import { findScrollContainer } from "./geometry";

export interface GuidedScrollOptions {
  reducedMotion: boolean;
  headerOffset?: number;
  signal?: AbortSignal;
  /** Cancel if the user scrolls more than this delta during animation. */
  userInterruptPx?: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateScroll(
  get: () => number,
  set: (v: number) => void,
  to: number,
  durationMs: number,
  signal?: AbortSignal,
): Promise<"done" | "cancelled"> {
  const from = get();
  const delta = to - from;
  if (Math.abs(delta) < 4) return Promise.resolve("done");

  return new Promise((resolve) => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (signal?.aborted) {
        cancelAnimationFrame(frame);
        resolve("cancelled");
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      set(from + delta * easeInOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else resolve("done");
    };
    frame = requestAnimationFrame(tick);
  });
}

/**
 * Controlled smooth scroll that respects sticky headers and nested containers.
 * Does not use bare scrollIntoView.
 */
export async function guidedScrollToElement(
  el: Element | null,
  opts: GuidedScrollOptions,
): Promise<"done" | "skipped" | "cancelled"> {
  if (!el || !(el instanceof HTMLElement)) return "skipped";

  const header = opts.headerOffset ?? VIEWPORT_INSETS.top;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const margin = 72;
  const fullyVisible = rect.top >= header + 8 && rect.bottom <= vh - margin;
  if (fullyVisible) return "skipped";

  if (opts.reducedMotion) {
    const container = findScrollContainer(el);
    if (container) {
      const cRect = container.getBoundingClientRect();
      container.scrollTop += rect.top - cRect.top - header;
    } else {
      const top = window.scrollY + rect.top - header - 48;
      window.scrollTo(0, Math.max(0, top));
    }
    return "done";
  }

  const container = findScrollContainer(el);
  const durationMs = Math.min(780, Math.max(320, Math.abs(rect.top - header) * 0.55));

  // User-interrupt detection
  let interrupted = false;
  const onWheel = () => { interrupted = true; };
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchmove", onWheel, { passive: true });

  try {
    if (container) {
      const cRect = container.getBoundingClientRect();
      const target = container.scrollTop + (rect.top - cRect.top) - header - 36;
      const result = await animateScroll(
        () => container.scrollTop,
        (v) => { container.scrollTop = v; },
        Math.max(0, target),
        durationMs,
        opts.signal,
      );
      return interrupted ? "cancelled" : result;
    }

    const target = window.scrollY + rect.top - header - 48;
    const result = await animateScroll(
      () => window.scrollY,
      (v) => window.scrollTo(0, v),
      Math.max(0, target),
      durationMs,
      opts.signal,
    );
    return interrupted ? "cancelled" : result;
  } finally {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchmove", onWheel);
  }
}
