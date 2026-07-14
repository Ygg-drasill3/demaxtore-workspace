import { useEffect, type ReactNode } from "react";
import { m } from "framer-motion";
import { useLocation } from "react-router-dom";
import { duration, easeOutExpo } from "../tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  children: ReactNode;
}

/**
 * Route transitions — enter-only fade.
 * Old page unmounts immediately; new page fades in (~180ms). No blur, scale, or exit wait.
 */
export function PageTransition({ children }: Props) {
  const location = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <m.div
      key={location.pathname}
      className="motion-page-root"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: duration.fast, ease: easeOutExpo }}
    >
      {children}
    </m.div>
  );
}
