import { useMemo } from "react";
import type { TargetGeometry } from "./geometry";
import { CARD, VIEWPORT_INSETS } from "./motionTokens";

export type CardSide = "right" | "left" | "bottom" | "top" | "center" | "sheet";

export interface CardPlacement {
  side: CardSide;
  x: number;
  y: number;
  width: number;
  /** Mobile bottom sheet mode. */
  sheet: boolean;
}

export interface CardPositionInput {
  target: TargetGeometry | null;
  cardHeight: number;
  viewportW: number;
  viewportH: number;
  rtl: boolean;
  isMobile: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Placement priority: right → left → bottom → top → center → mobile sheet.
 * RTL mirrors horizontal priority.
 */
export function computeCardPlacement(input: CardPositionInput): CardPlacement {
  const { target, cardHeight, viewportW, viewportH, rtl, isMobile } = input;
  const width = Math.min(CARD.maxWidth, Math.max(CARD.minWidth, Math.min(CARD.width, viewportW - 32)));
  const bottomInset = isMobile ? VIEWPORT_INSETS.bottomMobile : VIEWPORT_INSETS.bottomDesktop;
  const topInset = VIEWPORT_INSETS.top;
  const sideInset = VIEWPORT_INSETS.side;

  if (isMobile) {
    return {
      side: "sheet",
      sheet: true,
      x: sideInset,
      y: viewportH - Math.min(cardHeight + 16, viewportH * CARD.mobileMaxHeightRatio) - 12,
      width: viewportW - sideInset * 2,
    };
  }

  if (!target || !target.visible || target.width < 8) {
    return {
      side: "center",
      sheet: false,
      x: (viewportW - width) / 2,
      y: clamp((viewportH - cardHeight) / 2, topInset, viewportH - cardHeight - bottomInset),
      width,
    };
  }

  const gap = CARD.gap;
  const tx = target.x;
  const ty = target.y;
  const tw = target.width;
  const th = target.height;
  // Tall targets (lists, full panels): sit beside the upper band users look at,
  // so the connector points at the relevant region instead of the geometric center.
  const tcy = th > 260 ? ty + Math.min(120, th * 0.2) : ty + th / 2;

  const spaceRight = viewportW - (tx + tw) - sideInset;
  const spaceLeft = tx - sideInset;
  const spaceBottom = viewportH - (ty + th) - bottomInset;
  const spaceTop = ty - topInset;

  const horizPriority: CardSide[] = rtl ? ["left", "right"] : ["right", "left"];
  const order: CardSide[] = [...horizPriority, "bottom", "top", "center"];

  for (const side of order) {
    if (side === "right" && spaceRight >= width + gap) {
      return {
        side,
        sheet: false,
        width,
        x: tx + tw + gap,
        y: clamp(tcy - cardHeight / 2, topInset, viewportH - cardHeight - bottomInset),
      };
    }
    if (side === "left" && spaceLeft >= width + gap) {
      return {
        side,
        sheet: false,
        width,
        x: tx - gap - width,
        y: clamp(tcy - cardHeight / 2, topInset, viewportH - cardHeight - bottomInset),
      };
    }
    if (side === "bottom" && spaceBottom >= cardHeight + gap) {
      return {
        side,
        sheet: false,
        width,
        x: clamp(tx + tw / 2 - width / 2, sideInset, viewportW - width - sideInset),
        y: ty + th + gap,
      };
    }
    if (side === "top" && spaceTop >= cardHeight + gap) {
      return {
        side,
        sheet: false,
        width,
        x: clamp(tx + tw / 2 - width / 2, sideInset, viewportW - width - sideInset),
        y: ty - gap - cardHeight,
      };
    }
  }

  return {
    side: "center",
    sheet: false,
    width,
    x: (viewportW - width) / 2,
    y: clamp((viewportH - cardHeight) / 2, topInset, viewportH - cardHeight - bottomInset),
  };
}

export function useGuideCardPosition(input: CardPositionInput): CardPlacement {
  return useMemo(
    () => computeCardPlacement(input),
    [
      input.target?.x,
      input.target?.y,
      input.target?.width,
      input.target?.height,
      input.target?.visible,
      input.cardHeight,
      input.viewportW,
      input.viewportH,
      input.rtl,
      input.isMobile,
    ],
  );
}
