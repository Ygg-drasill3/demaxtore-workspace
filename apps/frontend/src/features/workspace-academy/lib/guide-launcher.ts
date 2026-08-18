// apps/frontend/src/features/workspace-academy/lib/guide-launcher.ts
//
// The only place driver.js is initialized. Lazy-loads the library + css so
// nothing lands in the main bundle. Handles missing targets, cleanup and
// never blocks or crashes the host page.
import type { GuideDefinition, GuideStep } from "../types/academy.types";

type TFn = (key: string, fallback?: string) => string;

export interface LaunchCallbacks {
  onStepViewed?: (stepIndex: number) => void;
  onCompleted?: () => void;
  onDismissed?: (lastStepIndex: number) => void;
}

let activeDestroy: (() => void) | null = null;

/** True while a guide overlay is on screen. */
export function isGuideActive(): boolean {
  return activeDestroy !== null;
}

/** Destroy any running guide (used on route change / logout). */
export function stopActiveGuide(_opts?: { silent?: boolean }): void {
  try { activeDestroy?.(); } catch { /* never crash */ }
  activeDestroy = null;
}

function waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) { window.clearInterval(timer); resolve(el); }
      else if (Date.now() - started > timeoutMs) { window.clearInterval(timer); resolve(null); }
    }, 250);
  });
}

async function resolveSteps(steps: readonly GuideStep[], timeoutMs: number): Promise<GuideStep[]> {
  const present: GuideStep[] = [];
  for (const step of steps) {
    if (!step.selector) {
      present.push(step);
      continue;
    }
    // First required step gets the full timeout; later ones a short check —
    // avoids long stalls while still tolerating lazy-rendered panels.
    const budget = present.length === 0 ? timeoutMs : 800;
    const el = await waitForElement(step.selector, step.optional ? Math.min(budget, 800) : budget);
    if (el) present.push(step);
    else if (!step.optional && present.length === 0) return []; // required anchor missing → abort
  }
  return present;
}

/**
 * Launch a contextual guide. Resolves true if it actually started.
 * Never throws — all failures resolve false and leave the page untouched.
 */
export async function launchGuide(
  guide: GuideDefinition,
  t: TFn,
  callbacks: LaunchCallbacks = {},
  startAtStep = 0,
  _options: { showIntro?: boolean } = {},
): Promise<boolean> {
  try {
    if (typeof document === "undefined") return false;
    stopActiveGuide();

    const steps = await resolveSteps(guide.steps, 6000);
    if (steps.length === 0) return false;

    const [{ driver }] = await Promise.all([
      import("driver.js"),
      import("driver.js/dist/driver.css"),
    ]);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const isRtl = document.documentElement.dir === "rtl";

    let completed = false;
    let lastIndex = 0;

    const instance = driver({
      showProgress: true,
      animate: !reduced,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: `dmx-academy-popover${isRtl ? " dmx-academy-rtl" : ""}`,
      progressText: "{{current}} / {{total}}",
      nextBtnText: t("wa.tour.next", "Next"),
      prevBtnText: t("wa.tour.prev", "Back"),
      doneBtnText: t("wa.tour.done", "Done"),
      steps: steps.map((s) => ({
        element: s.selector,
        popover: {
          title: t(s.titleKey),
          description: t(s.descKey),
        },
      })),
      onHighlighted: () => {
        lastIndex = instance.getActiveIndex() ?? 0;
        callbacks.onStepViewed?.(lastIndex);
      },
      onDestroyed: () => {
        activeDestroy = null;
        if (completed) callbacks.onCompleted?.();
        else callbacks.onDismissed?.(lastIndex);
      },
    });

    // Mark completion when the user finishes the last step via "Done".
    const origMoveNext = instance.moveNext.bind(instance);
    instance.moveNext = () => {
      if (instance.isLastStep()) completed = true;
      origMoveNext();
    };

    activeDestroy = () => instance.destroy();
    instance.drive(Math.min(startAtStep, steps.length - 1));
    return true;
  } catch {
    activeDestroy = null;
    return false;
  }
}
