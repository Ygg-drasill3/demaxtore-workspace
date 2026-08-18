import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";

interface Props {
  nodes: { id: string; label: string; active?: boolean }[];
  reducedMotion: boolean;
}

/** Horizontal workspace chain: RFQ → PO → Order → Shipment. */
export function RouteConnector({ nodes, reducedMotion }: Props) {
  return (
    <div className="mt-3 pt-3 border-t border-[var(--dmx-guide-border)]" aria-hidden="true">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 mb-2">
        Workspace chain
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {nodes.map((node, i) => (
          <div key={node.id} className="contents">
            <m.span
              className={
                node.active
                  ? "inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--dmx-guide-accent)] text-white"
                  : "inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold border border-[var(--dmx-guide-border)] text-[var(--dmx-guide-ink)] bg-white/80"
              }
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: guideDuration.fast,
                ease: guideEase.enter,
                delay: reducedMotion ? 0 : 0.06 + i * 0.05,
              }}
            >
              {node.label}
            </m.span>
            {i < nodes.length - 1 && (
              <svg width="16" height="8" viewBox="0 0 16 8" className="text-zinc-300 shrink-0">
                <m.path
                  d="M1 4 H12"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: reducedMotion ? 0.01 : guideDuration.normal,
                    delay: reducedMotion ? 0 : 0.1 + i * 0.05,
                  }}
                />
                <m.path
                  d="M11 1.5 L14 4 L11 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reducedMotion ? 0 : 0.18 + i * 0.05 }}
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
