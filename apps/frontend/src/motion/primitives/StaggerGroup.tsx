import { type ReactNode } from "react";
import { m } from "framer-motion";
import { staggerContainer } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Orchestrates staggered child reveals — ideal for KPI rows and widget grids. */
export function StaggerGroup({ children, className }: Props) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </m.div>
  );
}
