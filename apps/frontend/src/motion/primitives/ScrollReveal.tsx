import { type ReactNode, useRef } from "react";
import { m, useInView } from "framer-motion";
import { fadeUpVariants } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  children: ReactNode;
  className?: string;
  /** Stagger index for orchestrated reveals */
  index?: number;
  /** Viewport threshold 0–1 */
  amount?: number;
  once?: boolean;
}

/**
 * Scroll reveal — elements emerge as user scrolls.
 * Improves scanability on dense enterprise dashboards.
 */
export function ScrollReveal({
  children,
  className,
  index = 0,
  amount = 0.2,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      ref={ref}
      className={className}
      custom={index}
      variants={fadeUpVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {children}
    </m.div>
  );
}
