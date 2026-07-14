import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Subtle ambient aurora — adds life without competing with data.
 * Fixed behind app shell content.
 */
export function AmbientBackground() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div className="dmx-ambient-layer" aria-hidden>
      <div className="dmx-ambient-blob dmx-ambient-blob--a" />
      <div className="dmx-ambient-blob dmx-ambient-blob--b" />
      <div className="dmx-ambient-noise" />
    </div>
  );
}
