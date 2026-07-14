// apps/frontend/src/components/ui/Modal.tsx
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { modalBackdropVariants, modalPanelVariants, reducedVariants } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

interface Props {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  description?: string;
  size?:     "sm" | "md" | "lg" | "xl";
  children:  ReactNode;
  footer?:   ReactNode;
  testId?:   string;
}

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-5xl" } as const;

export function Modal({ open, onClose, title, description, size = "md", children, footer, testId = "modal" }: Props) {
  const reduced = useReducedMotion();
  const backdropV = reduced ? reducedVariants : modalBackdropVariants;
  const panelV = reduced ? reducedVariants : modalPanelVariants;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          data-testid={`${testId}-backdrop`}
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[6px] grid place-items-center p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <m.div
            data-testid={testId}
            onClick={(e) => e.stopPropagation()}
            className={cn("bg-white rounded-2xl shadow-modal w-full dmx-motion-gpu", SIZES[size])}
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {(title || description) && (
              <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-paper-200">
                <div>
                  {title       && <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>}
                  {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
                </div>
                <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-700 p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="px-6 py-4 text-sm">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-paper-200 flex justify-end gap-2 rounded-b-2xl bg-paper-50/40">
                {footer}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
