import { useState, type ReactNode } from "react";
import { m, AnimatePresence } from "framer-motion";
import { springMicro, reducedVariants } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

interface Props {
  label:    string;
  children: ReactNode;
  enabled?: boolean;
}

/** Collapsed-sidebar label tooltip — minimal fade + slide. */
export function NavTooltip({ label, children, enabled = true }: Props) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  if (!enabled) return <>{children}</>;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <m.div
            role="tooltip"
            initial={reduced ? "animate" : { opacity: 0, x: -6 }}
            animate={reduced ? "animate" : { opacity: 1, x: 0 }}
            exit={reduced ? "exit" : { opacity: 0, x: -4 }}
            transition={reduced ? undefined : springMicro}
            variants={reduced ? reducedVariants : undefined}
            className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink-950 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            {label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-ink-950" />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
