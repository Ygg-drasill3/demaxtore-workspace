// apps/frontend/src/components/ui/ToastHost.tsx
import { useCallback, useEffect } from "react";
import { m, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useToast } from "@/store/toast.store";
import type { NotificationType } from "@dmx/contracts/notifications";
import { toastVariants } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

const ICON: Record<NotificationType, typeof AlertCircle> = {
  INFO:    Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR:   AlertCircle,
};

function ToastItem({
  id,
  type,
  title,
  body,
  ttl,
  onRemove,
  reduced,
}: {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  ttl?: number;
  onRemove: (id: string) => void;
  reduced: boolean;
}) {
  const isAlert = type === "ERROR" || type === "WARNING";
  const Icon = ICON[type];
  const duration = ttl && ttl > 0 ? ttl : 5200;
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-80, 0], [0, 1]);

  const dismiss = useCallback(() => onRemove(id), [id, onRemove]);

  useEffect(() => {
    if (duration <= 0 || reduced) return undefined;
    const timer = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, duration, reduced]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -40 || info.velocity.y < -400) dismiss();
  };

  const shellClass = [
    "toast-shell pointer-events-auto w-full dmx-motion-gpu",
    isAlert ? "toast-shell-error" : "toast-shell-default",
  ].join(" ");

  const content = (
    <>
      <div className="toast-accent" aria-hidden="true" />
      <div className={`toast-icon-wrap ${isAlert ? "toast-icon-error" : "toast-icon-default"}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <div className="toast-title">{title}</div>
        {body && <div className="toast-description">{body}</div>}
      </div>
      <button type="button" onClick={dismiss} className="toast-close" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      {duration > 0 && (
        <div
          className={`toast-progress ${isAlert ? "toast-progress-error" : ""}`}
          style={{ ["--toast-duration" as string]: `${duration}ms` }}
        />
      )}
    </>
  );

  if (reduced) {
    return (
      <div data-testid={`toast-${id}`} role="alert" className={shellClass}>
        {content}
      </div>
    );
  }

  return (
    <m.div
      data-testid={`toast-${id}`}
      role="alert"
      className={shellClass}
      style={{ y, opacity }}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.35}
      onDragEnd={onDragEnd}
    >
      {content}
    </m.div>
  );
}

/** Premium toast stack — spring physics + swipe-to-dismiss. */
export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);
  const reduced = useReducedMotion();

  return (
    <div
      data-testid="toast-host"
      aria-live="polite"
      aria-relevant="additions"
      className="fixed top-6 left-1/2 z-[100] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            type={t.type}
            title={t.title}
            body={t.body}
            ttl={t.ttl}
            onRemove={remove}
            reduced={reduced}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
