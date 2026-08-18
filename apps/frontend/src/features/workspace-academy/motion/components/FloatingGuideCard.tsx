import { useLayoutEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuideDefinition } from "../../types/academy.types";
import type { TargetGeometry } from "../geometry";
import { useGuideCardPosition } from "../useGuideCardPosition";
import { guidedSpring, reducedTween } from "../motionPresets";
import { Z_GUIDE } from "../motionTokens";
import { GuideProgressRail } from "./GuideProgressRail";
import { GuideStepTransition } from "./GuideStepTransition";
import { RouteConnector } from "../svg/RouteConnector";
import { WorkspaceConnector } from "../svg/WorkspaceConnector";

export interface FloatingGuideCardProps {
  guide: GuideDefinition;
  title: string;
  description: string;
  stepIndex: number;
  totalSteps: number;
  contentDir: 1 | -1;
  target: TargetGeometry;
  rtl: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  labels: {
    next: string;
    prev: string;
    done: string;
    skip: string;
  };
  chainLabels?: { id: string; label: string; active?: boolean }[];
  showWorkspaceFlow?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  onPlacement?: (p: {
    x: number;
    y: number;
    width: number;
    height: number;
    side: string;
    sheet: boolean;
  }) => void;
}

export function FloatingGuideCard({
  guide,
  title,
  description,
  stepIndex,
  totalSteps,
  contentDir,
  target,
  rtl,
  isMobile,
  reducedMotion,
  labels,
  chainLabels,
  showWorkspaceFlow,
  onNext,
  onPrev,
  onSkip,
  onDismiss,
  onPlacement,
}: FloatingGuideCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);

  useLayoutEffect(() => {
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (ref.current) {
        const h = ref.current.offsetHeight;
        setCardHeight((prev) => (Math.abs(prev - h) < 1 ? prev : h));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stepIndex, title, description]);

  const placement = useGuideCardPosition({
    target,
    cardHeight,
    viewportW: vw,
    viewportH: vh,
    rtl,
    isMobile,
  });

  const onPlacementRef = useRef(onPlacement);
  onPlacementRef.current = onPlacement;
  const lastPlacementKey = useRef("");

  useLayoutEffect(() => {
    const key = `${placement.side}:${placement.sheet}:${Math.round(placement.x)}:${Math.round(placement.y)}:${Math.round(placement.width)}:${Math.round(cardHeight)}`;
    if (key === lastPlacementKey.current) return;
    lastPlacementKey.current = key;
    onPlacementRef.current?.({
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: cardHeight,
      side: placement.side,
      sheet: placement.sheet,
    });
  }, [placement.side, placement.sheet, placement.x, placement.y, placement.width, cardHeight]);

  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= totalSteps - 1;
  const transition = reducedMotion ? reducedTween : guidedSpring;

  const body = (
    <>
      <div className="px-4 pt-3 pb-1">
        <GuideProgressRail current={stepIndex} total={totalSteps} reducedMotion={reducedMotion} />
      </div>

      <div className="px-4 pt-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Step {stepIndex + 1} of {totalSteps}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onDismiss}
            className="dmx-guide-interactive -mt-1 -me-1 h-7 w-7 grid place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <GuideStepTransition stepKey={`${guide.id}:${stepIndex}`} dir={contentDir} rtl={rtl}>
          <h3 className="mt-1.5 font-[Fraunces,serif] text-[17px] font-semibold tracking-tight text-[#0b1020] leading-snug pe-2">
            {title}
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{description}</p>
        </GuideStepTransition>

        {stepIndex === 0 && chainLabels && chainLabels.length > 0 && (
          <RouteConnector nodes={chainLabels} reducedMotion={reducedMotion} />
        )}
        {stepIndex === 0 && showWorkspaceFlow && (
          <div className="mt-3">
            <WorkspaceConnector
              title="Linked workspaces"
              reducedMotion={reducedMotion}
              nodes={[
                { id: "rfq", label: "RFQ", active: guide.routeMatcher.includes("/rfq") },
                { id: "po", label: "PO", active: guide.routeMatcher.includes("/po") },
                { id: "order", label: "Order", active: guide.routeMatcher.includes("/order") },
                { id: "ship", label: "Ship", active: guide.routeMatcher.includes("/shipment") },
              ]}
            />
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onSkip}
          className="dmx-guide-interactive text-[12px] font-medium text-zinc-500 hover:text-[#0b1020] me-auto px-1 py-1.5"
        >
          {labels.skip}
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className={cn(
            "dmx-guide-interactive h-9 px-3.5 rounded-lg text-[13px] font-semibold border border-zinc-200 bg-white text-[#0b1020]",
            "disabled:opacity-40 disabled:pointer-events-none",
          )}
        >
          {labels.prev}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="dmx-guide-interactive h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-[#1a237e] hover:bg-[#3949ab]"
        >
          {isLast ? labels.done : labels.next}
        </button>
      </div>
    </>
  );

  if (placement.sheet) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        style={{ zIndex: Z_GUIDE.card }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-label={title}
          data-testid="academy-guide-card"
          data-academy-guide-card="true"
          className="dmx-guide-interactive dmx-guide-card w-full max-w-lg overflow-hidden rounded-2xl"
          style={{ background: "#ffffff" }}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-testid="academy-guide-card"
      data-academy-guide-card="true"
      className="dmx-guide-interactive dmx-guide-card overflow-hidden rounded-2xl"
      style={{
        width: placement.width,
        zIndex: Z_GUIDE.card,
        position: "fixed",
        left: 0,
        top: 0,
        background: "#ffffff",
      }}
      initial={false}
      animate={{
        x: placement.x,
        y: placement.y,
        opacity: 1,
      }}
      transition={transition}
    >
      {body}
    </m.div>
  );
}
