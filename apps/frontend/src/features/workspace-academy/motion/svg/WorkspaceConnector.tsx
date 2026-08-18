import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";
import { cameraSpring } from "../motionPresets";

export interface FlowNode {
  id: string;
  label: string;
  active?: boolean;
}

interface Props {
  nodes: FlowNode[];
  reducedMotion: boolean;
  title?: string;
}

/** Diagrammatic RFQ → PO → Order (or Order → Shipment) flow for educational overlays. */
export function WorkspaceConnector({ nodes, reducedMotion, title }: Props) {
  const w = 280;
  const h = 72;
  const step = nodes.length > 1 ? (w - 40) / (nodes.length - 1) : 0;

  return (
    <div className="w-full">
      {title && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 mb-2">
          {title}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[280px]" aria-hidden="true">
        {nodes.slice(0, -1).map((_, i) => {
          const x1 = 20 + i * step;
          const x2 = 20 + (i + 1) * step;
          return (
            <m.path
              key={`line-${i}`}
              d={`M ${x1 + 18} ${h / 2} C ${x1 + step * 0.4} ${h / 2}, ${x2 - step * 0.4} ${h / 2}, ${x2 - 18} ${h / 2}`}
              fill="none"
              stroke="rgba(26,35,126,0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: reducedMotion ? 0.01 : guideDuration.cinematic,
                ease: guideEase.enter,
                delay: reducedMotion ? 0 : 0.15 + i * 0.12,
              }}
            />
          );
        })}
        {nodes.map((node, i) => {
          const cx = 20 + i * step;
          const cy = h / 2;
          return (
            <g key={node.id}>
              <m.circle
                cx={cx}
                cy={cy}
                r={node.active ? 11 : 9}
                fill={node.active ? "#1a237e" : "#fff"}
                stroke={node.active ? "#1a237e" : "rgba(15,23,42,0.16)"}
                strokeWidth={1.5}
                initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: node.active ? 1 : 0.85 }}
                transition={reducedMotion ? { duration: 0.01 } : { ...cameraSpring, delay: 0.08 + i * 0.12 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
              <m.text
                x={cx}
                y={cy + 26}
                textAnchor="middle"
                fontSize="9"
                fontWeight={node.active ? 700 : 500}
                fill={node.active ? "#1a237e" : "#64748b"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : 0.2 + i * 0.1 }}
              >
                {node.label}
              </m.text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
