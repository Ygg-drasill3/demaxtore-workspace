import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LazyMotion, domMax } from "framer-motion";
import type { GuideDefinition, GuideStep } from "../types/academy.types";
import type { LaunchCallbacks } from "../lib/guide-launcher-types";
import { GuideTourHost } from "./GuideTourHost";
import "./styles/guide-motion.css";

let root: Root | null = null;
let hostEl: HTMLElement | null = null;
let activeDestroy: (() => void) | null = null;
let silentDestroy = false;

export function isMotionGuideActive(): boolean {
  return activeDestroy !== null;
}

export function stopMotionGuide(opts?: { silent?: boolean }): void {
  silentDestroy = opts?.silent !== false;
  try {
    activeDestroy?.();
  } catch {
    /* never crash host */
  }
  activeDestroy = null;
  silentDestroy = false;
}

function unmount(): void {
  try {
    root?.unmount();
  } catch {
    /* ignore */
  }
  root = null;
  hostEl?.remove();
  hostEl = null;
}

class TourErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[academy-tour] GuideTourHost crashed:", error, info.componentStack);
    this.props.onError();
  }

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid="academy-guide-fallback"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 999999,
            maxWidth: 320,
            padding: 16,
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Guide failed to render</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export async function mountGuideTour(opts: {
  guide: GuideDefinition;
  steps: GuideStep[];
  t: (key: string, fallback?: string) => string;
  startAtStep?: number;
  showIntro?: boolean;
  callbacks: LaunchCallbacks;
}): Promise<boolean> {
  stopMotionGuide({ silent: true });
  silentDestroy = false;

  if (typeof document === "undefined" || opts.steps.length === 0) return false;

  hostEl = document.createElement("div");
  hostEl.id = "dmx-academy-tour-root";
  document.body.appendChild(hostEl);
  root = createRoot(hostEl);

  let settled = false;

  activeDestroy = () => {
    unmount();
    activeDestroy = null;
    void settled;
    void silentDestroy;
  };

  try {
    root.render(
      <LazyMotion features={domMax} strict>
        <TourErrorBoundary
          onError={() => {
            settled = true;
            activeDestroy = null;
          }}
        >
          <GuideTourHost
            guide={opts.guide}
            steps={opts.steps}
            t={opts.t}
            startAtStep={opts.startAtStep}
            showIntro={opts.showIntro}
            callbacks={opts.callbacks}
            onFinished={() => {
              settled = true;
              unmount();
              activeDestroy = null;
            }}
          />
        </TourErrorBoundary>
      </LazyMotion>,
    );
    return true;
  } catch (err) {
    console.error("[academy-tour] mountGuideTour failed:", err);
    unmount();
    activeDestroy = null;
    return false;
  }
}
