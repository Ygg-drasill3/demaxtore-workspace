import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GuideDefinition, GuideStep } from "../types/academy.types";
import type { LaunchCallbacks } from "../lib/guide-launcher-types";
import type { GuideFinishReason } from "./guideMotionState";
import { useReducedMotionPreferences } from "./useReducedMotionPreferences";
import { useSpotlightGeometry } from "./useSpotlightGeometry";
import { useTargetTransition } from "./useTargetTransition";
import { guidedScrollToElement } from "./guidedScroll";
import type { CardPlacement } from "./useGuideCardPosition";
import { CinematicOverlay } from "./components/CinematicOverlay";
import { FloatingGuideCard } from "./components/FloatingGuideCard";

type TFn = (key: string, fallback?: string) => string;

const CHAIN = [
  { id: "rfq", key: "wa.chain.rfq", match: "/workspace/rfq" },
  { id: "po", key: "wa.chain.po", match: "/workspace/po" },
  { id: "order", key: "wa.chain.order", match: "/workspace/order" },
  { id: "shipment", key: "wa.chain.shipment", match: "/workspace/shipment" },
  { id: "trade", key: "wa.chain.trade", match: "/workspace/trade" },
] as const;

export interface GuideTourHostProps {
  guide: GuideDefinition;
  steps: GuideStep[];
  t: TFn;
  startAtStep?: number;
  showIntro?: boolean;
  callbacks: LaunchCallbacks;
  onFinished: (reason: GuideFinishReason, lastIndex: number) => void;
}

function placementEqual(a: CardPlacement | null, b: CardPlacement): boolean {
  if (!a) return false;
  return (
    a.side === b.side &&
    a.sheet === b.sheet &&
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5
  );
}

export function GuideTourHost({
  guide,
  steps,
  t,
  startAtStep = 0,
  callbacks,
  onFinished,
}: GuideTourHostProps) {
  const prefs = useReducedMotionPreferences();
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(0, startAtStep), Math.max(0, steps.length - 1)),
  );
  const [contentDir, setContentDir] = useState<1 | -1>(1);
  const [cardPlacement, setCardPlacement] = useState<CardPlacement | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [cameraWiden, setCameraWiden] = useState(false);
  const [exiting, setExiting] = useState(false);

  const finishing = useRef(false);
  const viewedRef = useRef<Set<number>>(new Set());
  const scrollAbort = useRef<AbortController | null>(null);
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const step = steps[stepIndex]!;
  const selector = step.selector ?? null;

  const targetEl = useMemo(() => {
    if (!selector) return null;
    return document.querySelector(selector);
  }, [selector, stepIndex]);

  const spotlightTarget = useMemo(
    () =>
      selector
        ? { mode: "element" as const, el: targetEl, selector }
        : { mode: "none" as const },
    [selector, targetEl],
  );

  const geometry = useSpotlightGeometry(
    spotlightTarget,
    !exiting,
    `${selector ?? "none"}:${stepIndex}`,
  );
  const transitionMeta = useTargetTransition(geometry, prefs.reducedMotion);

  const chainLabels = useMemo(() => {
    if (!guide.routeMatcher.startsWith("/workspace/")) return undefined;
    return CHAIN.map((n) => ({
      id: n.id,
      label: t(n.key),
      active: guide.routeMatcher.startsWith(n.match),
    }));
  }, [guide.routeMatcher, t]);

  const finish = useCallback(
    (reason: GuideFinishReason) => {
      if (finishing.current) return;
      finishing.current = true;
      const idx = stepIndexRef.current;
      const cb = callbacksRef.current;
      setExiting(true);
      window.setTimeout(() => {
        onFinished(reason, idx);
        if (reason === "completed") cb.onCompleted?.();
        else if (reason === "skipped") cb.onSkipped?.(idx);
        else cb.onDismissed?.(idx);
      }, prefs.reducedMotion ? 40 : 220);
    },
    [onFinished, prefs.reducedMotion],
  );

  const onPlacement = useCallback(
    (p: {
      x: number;
      y: number;
      width: number;
      height: number;
      side: string;
      sheet: boolean;
    }) => {
      const next: CardPlacement = {
        side: p.side as CardPlacement["side"],
        x: p.x,
        y: p.y,
        width: p.width,
        sheet: p.sheet,
      };
      setCardPlacement((prev) => (placementEqual(prev, next) ? prev : next));
      setCardHeight((h) => (Math.abs(h - p.height) < 1 ? h : p.height));
    },
    [],
  );

  useEffect(() => {
    if (exiting) return;

    scrollAbort.current?.abort();
    const ac = new AbortController();
    scrollAbort.current = ac;
    let cancelled = false;
    const idx = stepIndex;

    (async () => {
      const el = selector ? document.querySelector(selector) : null;
      if (el) {
        setCameraWiden(true);
        await guidedScrollToElement(el, {
          reducedMotion: prefs.reducedMotion,
          signal: ac.signal,
        });
        if (!cancelled) setCameraWiden(false);
      }

      if (cancelled || ac.signal.aborted) return;

      if (!viewedRef.current.has(idx)) {
        viewedRef.current.add(idx);
        callbacksRef.current.onStepViewed?.(idx);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      setCameraWiden(false);
    };
  }, [stepIndex, selector, prefs.reducedMotion, exiting]);

  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      finish("completed");
      return;
    }
    setContentDir(1);
    setStepIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (stepIndex <= 0) return;
    setContentDir(-1);
    setStepIndex((i) => i - 1);
  };

  if (exiting) return null;

  const dark = document.documentElement.classList.contains("dark");

  return (
    <div
      className="dmx-guide-root"
      data-theme={dark ? "dark" : "light"}
      data-testid="academy-guide-root"
      data-phase="ACTIVE"
    >
      <CinematicOverlay
        target={geometry}
        transitionMeta={transitionMeta}
        reducedMotion={prefs.reducedMotion}
        cameraWiden={cameraWiden}
        showSpotlight={Boolean(selector)}
        cardPlacement={cardPlacement}
        cardHeight={cardHeight}
        showArrow={
          Boolean(cardPlacement) &&
          !prefs.isMobile &&
          !prefs.reducedMotion &&
          Boolean(selector)
        }
      />

      <FloatingGuideCard
        guide={guide}
        title={t(step.titleKey)}
        description={t(step.descKey)}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        contentDir={contentDir}
        target={geometry}
        rtl={prefs.rtl}
        isMobile={prefs.isMobile}
        reducedMotion={prefs.reducedMotion}
        labels={{
          next: t("wa.tour.next", "Next"),
          prev: t("wa.tour.prev", "Back"),
          done: t("wa.tour.done", "Done"),
          skip: t("wa.tour.skip", "Skip"),
        }}
        chainLabels={chainLabels}
        showWorkspaceFlow={guide.routeMatcher.startsWith("/workspace/")}
        onNext={goNext}
        onPrev={goPrev}
        onSkip={() => finish("skipped")}
        onDismiss={() => finish("dismissed")}
        onPlacement={onPlacement}
      />
    </div>
  );
}
