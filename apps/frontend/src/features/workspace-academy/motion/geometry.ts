import { SPOTLIGHT_PADDING } from "./motionTokens";

export type GuideTargetMode = "element" | "group" | "row" | "column" | "virtualRect";

export interface TargetGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  visible: boolean;
  /** Document-relative top of the element (for scroll math). */
  pageTop: number;
  scrollContainer: HTMLElement | null;
}

export interface VirtualRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

const FALLBACK: TargetGeometry = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  radius: 14,
  visible: false,
  pageTop: 0,
  scrollContainer: null,
};

/** Nearest scrollable ancestor (overflow auto/scroll), else null → window. */
export function findScrollContainer(el: Element | null): HTMLElement | null {
  let node: Element | null = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight + 2) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function readRadius(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const raw = style.borderTopLeftRadius || style.borderRadius || "14px";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 14;
  return Math.min(Math.max(n, 8), 28);
}

export function geometryFromRect(
  rect: DOMRect | VirtualRect,
  opts?: { radius?: number; el?: HTMLElement | null },
): TargetGeometry {
  const pad = SPOTLIGHT_PADDING;
  const width = Math.max(rect.width + pad * 2, 24);
  const height = Math.max(rect.height + pad * 2, 24);
  const x = rect.x - pad;
  const y = rect.y - pad;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible =
    rect.width > 1 &&
    rect.height > 1 &&
    x + width > 0 &&
    y + height > 0 &&
    x < vw &&
    y < vh;

  return {
    x,
    y,
    width,
    height,
    radius: opts?.radius ?? (opts?.el ? readRadius(opts.el) : 14),
    visible,
    pageTop: (opts?.el?.getBoundingClientRect().top ?? rect.y) + window.scrollY,
    scrollContainer: opts?.el ? findScrollContainer(opts.el) : null,
  };
}

export function readElementGeometry(el: Element | null): TargetGeometry {
  if (!el || !(el instanceof HTMLElement)) return { ...FALLBACK };
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 && rect.height < 2) return { ...FALLBACK, scrollContainer: findScrollContainer(el) };
  return geometryFromRect(rect, { el });
}

/** Union bounding box for multi-element groups. */
export function readGroupGeometry(els: Element[]): TargetGeometry {
  const htmlEls = els.filter((e): e is HTMLElement => e instanceof HTMLElement);
  if (htmlEls.length === 0) return { ...FALLBACK };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of htmlEls) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.right);
    maxY = Math.max(maxY, r.bottom);
  }
  if (!Number.isFinite(minX)) return readElementGeometry(htmlEls[0]!);
  return geometryFromRect(
    { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    { el: htmlEls[0]!, radius: 16 },
  );
}

export function centerFallbackGeometry(): TargetGeometry {
  const w = Math.min(360, window.innerWidth - 48);
  const h = 120;
  return {
    x: (window.innerWidth - w) / 2,
    y: (window.innerHeight - h) / 2 - 40,
    width: w,
    height: h,
    radius: 18,
    visible: true,
    pageTop: window.scrollY + (window.innerHeight - h) / 2,
    scrollContainer: null,
  };
}

export function distanceBetween(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const acx = a.x + a.width / 2;
  const acy = a.y + a.height / 2;
  const bcx = b.x + b.width / 2;
  const bcy = b.y + b.height / 2;
  return Math.hypot(acx - bcx, acy - bcy);
}
