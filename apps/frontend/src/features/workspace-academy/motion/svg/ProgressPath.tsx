import { m } from "framer-motion";
import { guideDuration, guideEase } from "../motionTokens";

interface Props {
  progress: number; // 0–1
  reducedMotion: boolean;
}

export function ProgressPath({ progress, reducedMotion }: Props) {
  const w = 120;
  const h = 4;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <rect x="0" y="0" width={w} height={h} rx="2" fill="rgba(15,23,42,0.06)" />
      <m.rect
        x="0"
        y="0"
        height={h}
        rx="2"
        fill="url(#dmx-guide-progress-grad)"
        initial={false}
        animate={{ width: Math.max(4, w * progress) }}
        transition={{
          duration: reducedMotion ? 0.01 : guideDuration.deliberate,
          ease: guideEase.standard,
        }}
      />
      <defs>
        <linearGradient id="dmx-guide-progress-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#3949ab" />
          <stop offset="100%" stopColor="#1a237e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
