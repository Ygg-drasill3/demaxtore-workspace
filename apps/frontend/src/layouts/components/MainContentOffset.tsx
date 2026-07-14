import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui.store";
import { sidebarWidth } from "@/layouts/sidebar.constants";
import { springSnappy } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { useMediaQuery } from "@/motion/hooks/useMediaQuery";
import type { ReactNode } from "react";

interface Props {
  children:  ReactNode;
  className?: string;
}

/** Main column — margin tracks animated sidebar width on desktop. */
export function MainContentOffset({ children, className }: Props) {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const reduced   = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const width     = sidebarWidth(collapsed);

  return (
    <m.div
      className={cn("flex-1 min-w-0 flex flex-col relative z-[2]", className)}
      initial={false}
      animate={{ marginLeft: isDesktop ? width : 0 }}
      transition={reduced ? { duration: 0 } : springSnappy}
    >
      {children}
    </m.div>
  );
}
