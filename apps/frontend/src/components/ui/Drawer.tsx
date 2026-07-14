// apps/frontend/src/components/ui/Drawer.tsx
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { drawerPanelVariants, modalBackdropVariants, reducedVariants } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

interface Props {
  open:     boolean;
  onClose:  () => void;
  title?:   string;
  width?:   "sm" | "md" | "lg";
  children: ReactNode;
  testId?:  string;
}

const WIDTHS = { sm: "w-[360px]", md: "w-[440px]", lg: "w-[540px]" } as const;

/** Right-anchored drawer with spring physics. */
export function Drawer({ open, onClose, title, width = "md", children, testId = "drawer" }: Props) {
  const reduced = useReducedMotion();
  const backdropV = reduced ? reducedVariants : modalBackdropVariants;
  const panelV = reduced ? reducedVariants : drawerPanelVariants;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          data-testid={`${testId}-backdrop`}
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-ink-950/30 backdrop-blur-[2px] flex justify-end"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <m.aside
            data-testid={testId}
            onClick={(e) => e.stopPropagation()}
            className={cn("h-full bg-white shadow-modal flex flex-col dmx-motion-gpu", WIDTHS[width])}
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <header className="h-14 px-5 flex items-center justify-between border-b border-paper-200">
              <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
              <button onClick={onClose} aria-label="Close drawer" className="text-zinc-400 hover:text-zinc-700 p-1">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto dmx-thin-scroll">{children}</div>
          </m.aside>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
