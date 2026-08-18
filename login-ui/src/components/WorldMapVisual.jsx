import React from "react";

const nodes = [
  { x: 42, y: 38, r: 3 },
  { x: 78, y: 28, r: 2.5 },
  { x: 118, y: 32, r: 3.5 },
  { x: 155, y: 45, r: 2.5 },
  { x: 195, y: 35, r: 3 },
  { x: 230, y: 42, r: 2 },
  { x: 265, y: 55, r: 3 },
  { x: 52, y: 62, r: 2 },
  { x: 95, y: 58, r: 2.5 },
  { x: 140, y: 68, r: 3 },
  { x: 180, y: 72, r: 2.5 },
  { x: 220, y: 65, r: 2 },
  { x: 255, y: 78, r: 2.5 },
  { x: 68, y: 88, r: 2 },
  { x: 165, y: 92, r: 2.5 },
  { x: 210, y: 85, r: 2 },
];

const routes = [
  "M 78 28 Q 100 18 118 32",
  "M 118 32 Q 145 20 195 35",
  "M 155 45 Q 175 30 230 42",
  "M 95 58 Q 120 48 140 68",
  "M 140 68 Q 165 55 195 35",
  "M 180 72 Q 200 58 265 55",
  "M 52 62 Q 75 50 118 32",
  "M 220 65 Q 240 50 265 55",
];

export default function WorldMapVisual({ className = "" }) {
  return (
    <svg
      viewBox="0 0 300 110"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <filter id="dotGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="300" height="110" fill="url(#mapGlow)" rx="8" />

      {Array.from({ length: 55 }, (_, i) => {
        const x = (i % 11) * 27 + 8;
        const y = Math.floor(i / 11) * 22 + 12;
        const show = (i * 7 + 3) % 5 !== 0;
        if (!show) return null;
        return (
          <circle
            key={`bg-${i}`}
            cx={x}
            cy={y}
            r="1"
            fill="rgba(147,197,253,0.15)"
          />
        );
      })}

      {routes.map((d, i) => (
        <path
          key={`route-${i}`}
          d={d}
          stroke="rgba(96,165,250,0.45)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 2"
        />
      ))}

      {nodes.map((n, i) => (
        <g key={`node-${i}`} filter="url(#dotGlow)">
          <circle cx={n.x} cy={n.y} r={n.r + 2} fill="rgba(59,130,246,0.2)" />
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill="#60a5fa"
            className="twinkle"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
