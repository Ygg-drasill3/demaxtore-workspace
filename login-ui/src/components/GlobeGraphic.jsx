import React from "react";

export default function GlobeGraphic({ className = "" }) {
  const nodes = [
    { cx: 80, cy: 100, r: 2.5 }, { cx: 140, cy: 70, r: 3 },
    { cx: 210, cy: 50, r: 2.5 }, { cx: 280, cy: 65, r: 3.5 },
    { cx: 350, cy: 90, r: 2.5 }, { cx: 410, cy: 120, r: 3 },
    { cx: 250, cy: 110, r: 2.5 }, { cx: 180, cy: 140, r: 2.5 },
    { cx: 320, cy: 145, r: 3 }, { cx: 120, cy: 130, r: 2 },
    { cx: 380, cy: 55, r: 2 }, { cx: 460, cy: 95, r: 2.5 },
  ];

  const meridians = [
    "M 30 160 Q 260 -30 490 160",
    "M 60 175 Q 260 10 460 175",
    "M 90 90 Q 260 70 430 90",
    "M 30 70 Q 260 150 490 70",
    "M 120 180 Q 260 40 400 180",
    "M 160 50 Q 260 120 360 50",
  ];

  return (
    <svg viewBox="0 0 520 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="globeGlow" cx="55%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <filter id="nodeBlur">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="260" cy="100" rx="220" ry="75" fill="url(#globeGlow)" />

      {meridians.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="rgba(147,197,253,0.28)"
          strokeWidth="0.7"
          fill="none"
        />
      ))}

      {[
        "M 50 130 Q 260 20 470 130",
        "M 100 155 Q 260 60 420 155",
      ].map((d, i) => (
        <path
          key={`lat-${i}`}
          d={d}
          stroke="rgba(147,197,253,0.18)"
          strokeWidth="0.5"
          fill="none"
        />
      ))}

      {nodes.map((n, i) => (
        <g key={i} filter="url(#nodeBlur)">
          <circle cx={n.cx} cy={n.cy} r={n.r + 3} fill="rgba(59,130,246,0.15)" />
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="#93c5fd"
            className="twinkle"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
