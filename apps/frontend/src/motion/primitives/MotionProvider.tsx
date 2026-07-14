import { type ReactNode } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

interface Props {
  children: ReactNode;
}

/**
 * Loads Framer Motion features lazily (~60% smaller than full bundle).
 * Wrap once at app root.
 */
export function MotionProvider({ children }: Props) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
