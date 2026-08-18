import { useId, useLayoutEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";
import { reducedTween } from "../motionPresets";

export interface CurvedArrowProps {
  pathD: string;
  /** Approximate length used before DOM measure; real length is measured from the path. */
  length: number;
  visible: boolean;
  reducedMotion: boolean;
  color?: string;
  /** Remount / restart draw when the step changes. */
  animKey?: string | number;
  /** Arrowhead tip (path end) and a point just before it for orientation. */
  tip?: { x: number; y: number };
  tipFrom?: { x: number; y: number };
}

function tipPolygon(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size = 10,
): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = angle + Math.PI - 0.45;
  const right = angle + Math.PI + 0.45;
  const x1 = to.x + Math.cos(left) * size;
  const y1 = to.y + Math.sin(left) * size;
  const x2 = to.x + Math.cos(right) * size;
  const y2 = to.y + Math.sin(right) * size;
  return `M ${to.x} ${to.y} L ${x1} ${y1} L ${x2} ${y2} Z`;
}

export function CurvedArrow({
  pathD,
  length,
  visible,
  reducedMotion,
  color = "rgba(26, 35, 126, 0.9)",
  animKey,
  tip,
  tipFrom,
}: CurvedArrowProps) {
  const reactId = useId();
  const glowId = `dmx-guide-arrow-glow-${reactId.replace(/:/g, "")}`;
  const measureRef = useRef<SVGPathElement | null>(null);
  const [pathLen, setPathLen] = useState<number | null>(null);

  useLayoutEffect(() => {
    setPathLen(null);
    const el = measureRef.current;
    if (!el) return;
    try {
      const total = el.getTotalLength();
      if (Number.isFinite(total) && total > 8) {
        // Padding so dasharray never falls short of the cubic (broken mid-line).
        setPathLen(total + 4);
        return;
      }
    } catch {
      /* fall through */
    }
    setPathLen(Math.max(length, 48));
  }, [pathD, length, animKey]);

  if (!visible || length < 8 || !pathD) return null;

  const tipPath = tip && tipFrom ? tipPolygon(tipFrom, tip, 11) : null;
  const measured = pathLen ?? Math.max(length, 48);
  const ready = pathLen != null;

  const drawDuration = reducedMotion ? 0.01 : guideDuration.cinematic;
  const drawTransition = reducedMotion
    ? reducedTween
    : { duration: drawDuration, ease: guideEase.enter };
  const tipDelay = reducedMotion ? 0 : drawDuration * 0.78;

  return (
    <svg
      key={animKey}
      className="absolute inset-0 w-full h-full overflow-visible"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Invisible measure path — always present so getTotalLength is accurate */}
      <path ref={measureRef} d={pathD} fill="none" stroke="transparent" strokeWidth={1} />

      {ready && (
        <>
          <m.path
            d={pathD}
            fill="none"
            stroke="rgba(26, 35, 126, 0.2)"
            strokeWidth={5.5}
            strokeLinecap="round"
            initial={{ strokeDashoffset: measured, opacity: 0 }}
            animate={{
              strokeDashoffset: visible ? 0 : measured,
              opacity: visible ? 1 : 0,
            }}
            transition={drawTransition}
            style={{ strokeDasharray: measured }}
          />

          <m.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.35}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            initial={{ strokeDashoffset: measured, opacity: 0 }}
            animate={{
              strokeDashoffset: visible ? 0 : measured,
              opacity: visible ? 1 : 0,
            }}
            transition={drawTransition}
            style={{ strokeDasharray: measured }}
          />

          {tipPath && tip && (
            <m.path
              d={tipPath}
              fill={color}
              filter={`url(#${glowId})`}
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{
                opacity: visible ? 1 : 0,
                scale: visible ? 1 : 0.55,
              }}
              transition={
                reducedMotion
                  ? reducedTween
                  : { duration: guideDuration.normal, ease: guideEase.enter, delay: tipDelay }
              }
              style={{ transformOrigin: `${tip.x}px ${tip.y}px` }}
            />
          )}
        </>
      )}
    </svg>
  );
}

export interface CurvePathResult {
  d: string;
  length: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Point used to orient the arrowhead (last control point). */
  tipFrom: { x: number; y: number };
}

/** Build a soft cubic curve between card anchor and target edge. */
export function buildCurvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): CurvePathResult {
  // Pull the tip back so the arrowhead sits on the target edge, not inside it.
  const dx0 = to.x - from.x;
  const dy0 = to.y - from.y;
  const dist = Math.hypot(dx0, dy0) || 1;
  const tipPull = Math.min(14, dist * 0.12);
  const tip = {
    x: to.x - (dx0 / dist) * tipPull,
    y: to.y - (dy0 / dist) * tipPull,
  };

  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let cx1: number;
  let cy1: number;
  let cx2: number;
  let cy2: number;

  if (absDx >= absDy) {
    const bow = Math.min(42, absDy * 0.45 + 12);
    const sign = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    cx1 = from.x + dx * 0.42;
    cy1 = from.y + sign * Math.min(bow, absDy * 0.4);
    cx2 = from.x + dx * 0.78;
    cy2 = tip.y - sign * Math.min(bow * 0.4, absDy * 0.22);
  } else {
    const bow = Math.min(42, absDx * 0.45 + 12);
    const sign = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    cx1 = from.x + sign * Math.min(bow, absDx * 0.4);
    cy1 = from.y + dy * 0.42;
    cx2 = tip.x - sign * Math.min(bow * 0.4, absDx * 0.22);
    cy2 = from.y + dy * 0.78;
  }

  const d = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tip.x} ${tip.y}`;
  // Overestimate until getTotalLength runs — never underestimate (that causes dash gaps).
  const length = Math.max(48, Math.hypot(dx, dy) * 1.35);
  return { d, length, from, to: tip, tipFrom: { x: cx2, y: cy2 } };
}
