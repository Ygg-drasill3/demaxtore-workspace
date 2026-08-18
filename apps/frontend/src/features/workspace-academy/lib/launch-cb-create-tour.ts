// Launch CommodityBid create-form tour inside the cross-origin iframe.
// Parent cannot highlight iframe fields — postMessage starts driver.js in the panel.
import type { LaunchCallbacks } from "./guide-launcher-types";

const MSG = "dmx.cb.createTour";
const PANEL_ORIGINS = [
  "https://commoditybid.demaxtore.com",
  "https://commodity-bid.demaxtore.com",
];

let embedTourActive = false;
let stopEmbedTour: (() => void) | null = null;

export function isCbEmbedTourActive(): boolean {
  return embedTourActive;
}

export function stopCbEmbedTour(): void {
  try {
    stopEmbedTour?.();
  } catch {
    /* */
  }
  stopEmbedTour = null;
  embedTourActive = false;
}

function isPanelOrigin(origin: string): boolean {
  return PANEL_ORIGINS.includes(origin) || origin.endsWith(".demaxtore.com");
}

function waitForCreateIframe(timeoutMs: number): Promise<HTMLIFrameElement | null> {
  return new Promise((resolve) => {
    const pick = () =>
      document.querySelector(
        '[data-testid="cb-external-embed-create"] iframe, [data-guide="commoditybid-create-form"] iframe',
      ) as HTMLIFrameElement | null;

    const found = pick();
    if (found?.contentWindow) return resolve(found);

    const start = Date.now();
    const timer = window.setInterval(() => {
      const el = pick();
      if (el?.contentWindow) {
        window.clearInterval(timer);
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 250);
  });
}

function postStart(iframe: HTMLIFrameElement) {
  const win = iframe.contentWindow;
  if (!win) return;
  for (const origin of PANEL_ORIGINS) {
    try {
      win.postMessage({ type: MSG, action: "start" }, origin);
    } catch {
      /* */
    }
  }
  // Wildcard fallback for unusual panel hosts in staging
  try {
    win.postMessage({ type: MSG, action: "start" }, "*");
  } catch {
    /* */
  }
}

/**
 * Ask the CommodityBid embed to run the Request Details field tour.
 * Resolves true once the iframe reports "started".
 */
export async function launchCommodityBidCreateEmbedTour(
  callbacks: LaunchCallbacks = {},
): Promise<boolean> {
  stopCbEmbedTour();
  const iframe = await waitForCreateIframe(22_000);
  if (!iframe?.contentWindow) {
    console.warn("[academy-tour] create iframe not found");
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let started = false;
    embedTourActive = true;
    let kickTimer: number | undefined;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(failSafe);
      if (kickTimer) window.clearInterval(kickTimer);
      window.removeEventListener("message", onMessage);
      document.getElementById("cb-embed-open-external")?.removeAttribute("data-tour");
      stopEmbedTour = null;
      embedTourActive = false;
      resolve(ok);
    };

    const cleanup = () => {
      window.clearTimeout(failSafe);
      if (kickTimer) window.clearInterval(kickTimer);
      window.removeEventListener("message", onMessage);
      document.getElementById("cb-embed-open-external")?.removeAttribute("data-tour");
      stopEmbedTour = null;
      embedTourActive = false;
    };

    const onMessage = (event: MessageEvent) => {
      if (!isPanelOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== MSG) return;

      if (data.event === "ready") {
        postStart(iframe);
        return;
      }
      if (data.event === "started") {
        if (started) return;
        started = true;
        if (kickTimer) window.clearInterval(kickTimer);
        document.getElementById("cb-embed-open-external")?.setAttribute("data-tour", "1");
        callbacks.onStepViewed?.(0);
        // Keep listeners until tour ends; only resolve the launch promise once.
        if (!settled) {
          settled = true;
          window.clearTimeout(failSafe);
          resolve(true);
        }
        return;
      }
      if (data.event === "step" && typeof data.stepIndex === "number") {
        callbacks.onStepViewed?.(data.stepIndex);
        return;
      }
      if (data.event === "completed") {
        callbacks.onCompleted?.();
        cleanup();
        return;
      }
      if (data.event === "skipped") {
        callbacks.onSkipped?.(typeof data.stepIndex === "number" ? data.stepIndex : 0);
        cleanup();
        return;
      }
      if (data.event === "dismissed") {
        callbacks.onDismissed?.(typeof data.stepIndex === "number" ? data.stepIndex : 0);
        cleanup();
      }
    };

    stopEmbedTour = () => {
      try {
        for (const origin of PANEL_ORIGINS) {
          iframe.contentWindow?.postMessage({ type: MSG, action: "stop" }, origin);
        }
      } catch {
        /* */
      }
      cleanup();
      if (!started) finish(false);
    };

    window.addEventListener("message", onMessage);

    // Kick immediately + retry — iframe may still be hydrating CreateRequestEmbedTour.
    postStart(iframe);
    kickTimer = window.setInterval(() => {
      if (!started) postStart(iframe);
    }, 1000);

    const failSafe = window.setTimeout(() => {
      if (!started) {
        console.warn("[academy-tour] create iframe tour did not start in time");
        finish(false);
      }
    }, 28_000);
  });
}
