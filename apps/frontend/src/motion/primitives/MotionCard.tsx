import { type ReactNode, useCallback, useRef } from "react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { springMicro } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  children?: ReactNode;
  className?: string;
  /** Enable soft 3D tilt + magnetic hover */
  interactive?: boolean;
  testId?: string;
}

/**
 * Premium card surface — floating elevation, 3D tilt, animated border glow.
 * Never simply "appears" — enters with depth.
 */
export function MotionCard({ children, className, interactive = true, testId }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduced || !interactive || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ref.current.style.setProperty("--tilt-x", `${py * -6}deg`);
      ref.current.style.setProperty("--tilt-y", `${px * 6}deg`);
    },
    [reduced, interactive],
  );

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--tilt-x", "0deg");
    ref.current.style.setProperty("--tilt-y", "0deg");
  }, []);

  if (reduced) {
    return (
      <div data-testid={testId} className={cn("dmx-card", className)}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      data-testid={testId}
      className={cn(
        "dmx-card dmx-card-tilt dmx-motion-gpu relative overflow-hidden",
        interactive && "group",
        className,
      )}
      style={{
        transform: "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
      }}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={interactive ? { y: -3, boxShadow: "0 12px 32px -12px rgba(15,23,42,0.14)" } : undefined}
      transition={springMicro}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(26,35,126,0.06), transparent 45%)",
          }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(26,35,126,0.08)",
        }}
      />
      {children}
    </m.div>
  );
}
