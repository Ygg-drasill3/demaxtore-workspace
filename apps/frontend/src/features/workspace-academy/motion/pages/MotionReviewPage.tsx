import { useMemo, useState } from "react";
import { m } from "framer-motion";
import { launchGuide, stopActiveGuide } from "../../lib/guide-launcher";
import type { GuideDefinition } from "../../types/academy.types";
import { WorkspaceFlowTransition } from "../components/WorkspaceFlowTransition";
import { GuideTimelineEmphasis } from "../components/GuideTimelineEmphasis";
import { RouteContinuationTransition } from "../components/RouteContinuationTransition";

const demoGuide: GuideDefinition = {
  id: "buyer-dashboard-v1",
  version: 99,
  titleKey: "wa.guide.dashboard.t",
  descKey: "wa.guide.dashboard.d",
  roles: ["BUYER"],
  routeMatcher: "/dev/workspace-academy-motion",
  automatic: false,
  maxAutomaticDisplays: 1,
  steps: [
    { selector: '[data-guide="motion-wide"]', titleKey: "wa.dev.motion.wide.t", descKey: "wa.dev.motion.wide.d" },
    { selector: '[data-guide="motion-small"]', titleKey: "wa.dev.motion.small.t", descKey: "wa.dev.motion.small.d" },
    { selector: '[data-guide="motion-tall"]', titleKey: "wa.dev.motion.tall.t", descKey: "wa.dev.motion.tall.d" },
    { selector: '[data-guide="motion-sticky"]', titleKey: "wa.dev.motion.sticky.t", descKey: "wa.dev.motion.sticky.d" },
    { selector: '[data-guide="motion-scroll"]', titleKey: "wa.dev.motion.scroll.t", descKey: "wa.dev.motion.scroll.d" },
  ],
};

const tMap: Record<string, string> = {
  "wa.guide.dashboard.t": "Motion review",
  "wa.guide.dashboard.d": "Dev surface for Academy motion QA",
  "wa.dev.motion.wide.t": "Wide target",
  "wa.dev.motion.wide.d": "Spotlight should morph across this wide band.",
  "wa.dev.motion.small.t": "Small target",
  "wa.dev.motion.small.d": "Precise padding and radius on a compact control.",
  "wa.dev.motion.tall.t": "Tall target",
  "wa.dev.motion.tall.d": "Card should reflow without clipping.",
  "wa.dev.motion.sticky.t": "Sticky target",
  "wa.dev.motion.sticky.d": "Geometry must track sticky chrome while scrolling.",
  "wa.dev.motion.scroll.t": "Distant scroll target",
  "wa.dev.motion.scroll.d": "Guided scroll then morph — spatial continuity.",
  "wa.tour.next": "Next",
  "wa.tour.prev": "Back",
  "wa.tour.done": "Done",
  "wa.tour.skip": "Skip",
  "wa.tour.introSubtitle": "Motion lab — inspect spotlight, card and connectors.",
};

/**
 * Development-only motion QA surface.
 * Not registered in production builds.
 */
export default function MotionReviewPage() {
  const [rtl, setRtl] = useState(false);
  const [dark, setDark] = useState(false);

  const t = useMemo(
    () => (key: string, fallback?: string) => tMap[key] ?? fallback ?? key,
    [],
  );

  const run = () => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", dark);
    void launchGuide(demoGuide, t, {}, 0, { showIntro: true });
  };

  return (
    <div className={dark ? "min-h-screen bg-zinc-950 text-zinc-100" : "min-h-screen bg-paper-50 text-ink-900"}>
      <div
        data-guide="motion-sticky"
        className="sticky top-0 z-20 border-b border-paper-200 bg-white/90 backdrop-blur px-6 py-3 flex flex-wrap gap-2 items-center"
      >
        <strong className="font-[Fraunces,serif] text-lg me-4">Academy motion lab</strong>
        <button type="button" className="h-8 px-3 rounded-lg bg-accent-900 text-white text-xs font-semibold" onClick={run}>
          Play demo tour
        </button>
        <button type="button" className="h-8 px-3 rounded-lg border text-xs" onClick={() => stopActiveGuide()}>
          Stop
        </button>
        <label className="text-xs flex items-center gap-1.5 ms-2">
          <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} /> RTL
        </label>
        <label className="text-xs flex items-center gap-1.5">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark
        </label>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <section data-guide="motion-wide" className="rounded-2xl border border-paper-200 bg-white p-8 shadow-card">
          <h2 className="text-xl font-semibold">Wide target</h2>
          <p className="text-sm text-zinc-500 mt-1">KPI-style band for morph QA.</p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <button data-guide="motion-small" type="button" className="h-10 rounded-lg bg-accent-900 text-white text-sm font-semibold">
            Small CTA
          </button>
          <div data-guide="motion-tall" className="rounded-xl border border-paper-200 bg-white p-4 min-h-[220px]">
            <h3 className="font-semibold">Tall panel</h3>
            <p className="text-sm text-zinc-500 mt-2">Pending actions stand-in.</p>
          </div>
        </div>

        <WorkspaceFlowTransition variant="rfq-po-order" reducedMotion={false} activeId="po" />
        <RouteContinuationTransition fromLabel="RFQ" toLabel="Purchase Order" reducedMotion={false} />
        <GuideTimelineEmphasis
          reducedMotion={false}
          stages={[
            { id: "a", label: "Draft", status: "done" },
            { id: "b", label: "Live", status: "current" },
            { id: "c", label: "Award", status: "future" },
            { id: "d", label: "PO", status: "future" },
          ]}
        />

        <div className="h-[70vh]" aria-hidden />
        <section data-guide="motion-scroll" className="rounded-2xl border border-paper-200 bg-white p-8 mb-24">
          <h2 className="text-xl font-semibold">Scroll target</h2>
          <p className="text-sm text-zinc-500 mt-1">Far below the fold — tests guided scroll.</p>
          <m.div
            className="mt-4 h-2 rounded-full bg-accent-900/20 overflow-hidden"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
          >
            <m.div className="h-full w-1/3 bg-accent-900" layout />
          </m.div>
        </section>
      </div>
    </div>
  );
}
