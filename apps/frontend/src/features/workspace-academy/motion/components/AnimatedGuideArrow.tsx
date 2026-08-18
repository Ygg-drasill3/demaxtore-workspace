import { useMemo } from "react";
import type { TargetGeometry } from "../geometry";
import type { CardPlacement } from "../useGuideCardPosition";
import { ARROW_HIDE_DISTANCE, Z_GUIDE } from "../motionTokens";
import { CurvedArrow, buildCurvePath } from "../svg/CurvedArrow";

interface Props {
  target: TargetGeometry;
  card: CardPlacement;
  cardHeight: number;
  reducedMotion: boolean;
  hidden?: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function cardAnchor(card: CardPlacement, cardHeight: number): { x: number; y: number } {
  if (card.sheet) {
    return { x: card.x + card.width / 2, y: card.y };
  }
  // Bias slightly toward the facing edge so the connector starts near the CTA row.
  const midY = card.y + cardHeight * 0.55;
  switch (card.side) {
    case "right":
      return { x: card.x, y: midY };
    case "left":
      return { x: card.x + card.width, y: midY };
    case "bottom":
      return { x: card.x + card.width / 2, y: card.y };
    case "top":
      return { x: card.x + card.width / 2, y: card.y + cardHeight };
    default:
      return { x: card.x + card.width / 2, y: midY };
  }
}

/** Land on the target edge facing the card, aligned with the card — not the geometric center. */
export function targetAnchor(
  target: TargetGeometry,
  from: { x: number; y: number },
): { x: number; y: number } {
  const pad = Math.min(16, Math.max(6, Math.min(target.width, target.height) * 0.12));
  const left = target.x;
  const right = target.x + target.width;
  const top = target.y;
  const bottom = target.y + target.height;
  const cx = left + target.width / 2;
  const cy = top + target.height / 2;
  const yMin = top + pad;
  const yMax = Math.max(yMin, bottom - pad);
  const xMin = left + pad;
  const xMax = Math.max(xMin, right - pad);

  if (Math.abs(from.x - cx) >= Math.abs(from.y - cy)) {
    return {
      x: from.x < cx ? left : right,
      y: clamp(from.y, yMin, yMax),
    };
  }
  return {
    x: clamp(from.x, xMin, xMax),
    y: from.y < cy ? top : bottom,
  };
}

export function AnimatedGuideArrow({
  target,
  card,
  cardHeight,
  reducedMotion,
  hidden,
}: Props) {
  const curve = useMemo(() => {
    if (!target.visible || card.sheet || card.side === "center") return null;
    const from = cardAnchor(card, cardHeight);
    const to = targetAnchor(target, from);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (dist < ARROW_HIDE_DISTANCE) return null;
    return buildCurvePath(from, to);
  }, [target, card, cardHeight]);

  if (hidden || !curve) return null;

  const animKey = [
    Math.round(curve.from.x),
    Math.round(curve.from.y),
    Math.round(curve.to.x),
    Math.round(curve.to.y),
  ].join(":");

  return (
    <div
      className="absolute inset-0 overflow-visible"
      style={{ zIndex: Z_GUIDE.arrow }}
      aria-hidden="true"
    >
      <CurvedArrow
        pathD={curve.d}
        length={curve.length}
        visible
        reducedMotion={reducedMotion}
        animKey={animKey}
        tip={curve.to}
        tipFrom={curve.tipFrom}
      />
    </div>
  );
}
