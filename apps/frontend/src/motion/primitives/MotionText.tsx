import { type ReactNode } from "react";
import { m } from "framer-motion";
import { springGentle } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
}

/**
 * Cinematic headline reveal — blur-to-sharp + upward drift.
 * Use sparingly on page titles and hero sections.
 */
export function MotionText({ children, className, as: Tag = "h2", delay = 0 }: Props) {
  const reduced = useReducedMotion();
  const Component = m[Tag];

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
      transition={{ ...springGentle, delay }}
    >
      {children}
    </Component>
  );
}
