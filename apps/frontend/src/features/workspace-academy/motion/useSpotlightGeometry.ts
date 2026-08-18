import { useEffect, useState } from "react";
import {
  centerFallbackGeometry,
  readElementGeometry,
  readGroupGeometry,
  type TargetGeometry,
  type VirtualRect,
} from "./geometry";

export type SpotlightTarget =
  | { mode: "element"; el: Element | null; selector?: string | null }
  | { mode: "group"; els: Element[] }
  | { mode: "virtualRect"; rect: VirtualRect | null }
  | { mode: "none" };

const MAX_UPDATES_PER_SEC = 45;

/**
 * Tracks target bounds with ResizeObserver + scroll + rAF coalescing.
 * `trackKey` must change when the logical target changes (e.g. selector).
 */
export function useSpotlightGeometry(
  target: SpotlightTarget,
  enabled: boolean,
  trackKey = "",
): TargetGeometry {
  const [geo, setGeo] = useState<TargetGeometry>(() => centerFallbackGeometry());

  useEffect(() => {
    if (!enabled) return;

    let lastEmit = 0;
    let pending = 0;
    let updates = 0;
    let windowStart = performance.now();

    const measure = () => {
      let next: TargetGeometry;
      if (target.mode === "element") {
        const live =
          (target.selector ? document.querySelector(target.selector) : null) ??
          (target.el && document.contains(target.el) ? target.el : null);
        next = live ? readElementGeometry(live) : centerFallbackGeometry();
      } else if (target.mode === "group") {
        next = target.els.length ? readGroupGeometry(target.els) : centerFallbackGeometry();
      } else if (target.mode === "virtualRect") {
        next = target.rect
          ? {
              x: target.rect.x - 10,
              y: target.rect.y - 10,
              width: target.rect.width + 20,
              height: target.rect.height + 20,
              radius: target.rect.radius ?? 12,
              visible: true,
              pageTop: target.rect.y + window.scrollY,
              scrollContainer: null,
            }
          : centerFallbackGeometry();
      } else {
        next = centerFallbackGeometry();
      }
      setGeo((prev) => {
        if (
          Math.abs(prev.x - next.x) < 0.5 &&
          Math.abs(prev.y - next.y) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5 &&
          prev.radius === next.radius &&
          prev.visible === next.visible
        ) {
          return prev;
        }
        return next;
      });

      updates += 1;
      const now = performance.now();
      if (now - windowStart > 1000) {
        if (import.meta.env.DEV && updates > MAX_UPDATES_PER_SEC * 1.5) {
          console.warn(
            `[academy-motion] geometry updates high: ${updates}/s — check observers`,
          );
        }
        updates = 0;
        windowStart = now;
      }
    };

    const schedule = () => {
      const now = performance.now();
      const minGap = 1000 / MAX_UPDATES_PER_SEC;
      if (now - lastEmit < minGap) {
        if (!pending) {
          pending = requestAnimationFrame(() => {
            pending = 0;
            lastEmit = performance.now();
            measure();
          });
        }
        return;
      }
      lastEmit = now;
      measure();
    };

    measure();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(schedule)
        : null;

    const watchEl = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return;
      ro?.observe(el);
      mo?.observe(el, { attributes: true, childList: true, subtree: true });
    };

    if (target.mode === "element") watchEl(target.el);
    if (target.mode === "group") target.els.forEach(watchEl);

    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (pending) cancelAnimationFrame(pending);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trackKey encodes target identity
  }, [enabled, trackKey]);

  return geo;
}
