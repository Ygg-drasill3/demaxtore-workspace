// Hook: automatic first-visit page guides.
// Single orchestration point — pages must not add their own useEffect launches.
import { useEffect, useRef } from "react";
import type { Role } from "@dmx/contracts/auth";
import type { AcademyStateDTO } from "@dmx/contracts/workspace-academy";
import type { GuideDefinition } from "../types/academy.types";
import { isGuideActive } from "../lib/guide-launcher";
import { isCbEmbedTourActive } from "../lib/launch-cb-create-tour";
import {
  evaluateAutoGuideLaunch,
  pageHasUnsavedForm,
  pageIsBlocked,
  type AutoGuideBlockReason,
} from "./guideEligibility";
import { AUTO_GUIDE_COOLDOWN_MS, markAutoGuideEnded } from "./GuideCooldown";

const LAUNCH_DELAY_MS = 900;
const RETRY_MS = 900;
const MAX_RETRIES = 16;

export interface AutomaticPageGuideOpts {
  role: Role | null | undefined;
  state: AcademyStateDTO | null;
  pathname: string;
  /** Launch helper from the provider (marks persistence + telemetry). */
  runAutomaticGuide: (guide: GuideDefinition) => Promise<boolean>;
  onBlocked?: (reason: AutoGuideBlockReason, pathname: string) => void;
  onEligible?: (guideId: string, pathname: string) => void;
}

/**
 * Watches route + academy state and auto-starts the highest-priority eligible
 * guide. Retries briefly while the page mounts required targets.
 */
export function useAutomaticPageGuide(opts: AutomaticPageGuideOpts): void {
  const { role, state, pathname, runAutomaticGuide, onBlocked, onEligible } = opts;
  const launchingRef = useRef(false);
  const lastAttemptRef = useRef<string>("");

  useEffect(() => {
    if (!role || !state) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let attempt = 0;
    // Allow a fresh attempt after every navigation (pathname change remounts this effect).
    lastAttemptRef.current = "";

    const tryLaunch = () => {
      if (cancelled || launchingRef.current) return;

      // A tour may still be destroying after a route change — retry briefly.
      if (isGuideActive() || isCbEmbedTourActive()) {
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          retryTimer = window.setTimeout(tryLaunch, RETRY_MS);
        }
        return;
      }

      const decision = evaluateAutoGuideLaunch({
        role,
        state,
        pathname,
        guideActive: false,
        pageBlocked: pageIsBlocked(),
        formDirty: pageHasUnsavedForm(),
      });

      if (!decision.guide) {
        if (
          decision.blocked === "targets-missing" ||
          decision.blocked === "page-blocked" ||
          decision.blocked === "guide-active"
        ) {
          // Retry while lazy panels mount or temporary overlays close
          if (attempt < MAX_RETRIES) {
            attempt += 1;
            retryTimer = window.setTimeout(tryLaunch, RETRY_MS);
            return;
          }
        }
        if (decision.blocked === "cooldown") {
          // After a guide ends on this route, unlock the next eligible one once cooldown elapses
          retryTimer = window.setTimeout(tryLaunch, AUTO_GUIDE_COOLDOWN_MS + 50);
          return;
        }
        if (decision.blocked && decision.blocked !== "no-candidates") {
          onBlocked?.(decision.blocked, pathname);
        }
        return;
      }

      const guide = decision.guide;
      const attemptKey = `${pathname}::${guide.id}::v${guide.version}`;
      if (lastAttemptRef.current === attemptKey) return;
      lastAttemptRef.current = attemptKey;

      onEligible?.(guide.id, pathname);
      launchingRef.current = true;
      void runAutomaticGuide(guide)
        .then((started) => {
          if (!started) {
            // Failed to resolve steps / race with destroy — retry while page settles
            lastAttemptRef.current = "";
            onBlocked?.("targets-missing", pathname);
            if (!cancelled && attempt < MAX_RETRIES) {
              attempt += 1;
              retryTimer = window.setTimeout(tryLaunch, RETRY_MS);
            }
          }
        })
        .finally(() => {
          launchingRef.current = false;
        });
    };

    const initial = window.setTimeout(tryLaunch, LAUNCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [role, state, pathname, runAutomaticGuide, onBlocked, onEligible]);
}

/** Call when an automatic guide ends so cooldown + route awareness updates. */
export function onAutomaticGuideFinished(guideId: string, pathname: string): void {
  markAutoGuideEnded(guideId, pathname);
}
