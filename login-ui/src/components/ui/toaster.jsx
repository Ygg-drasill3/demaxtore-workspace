import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "../../hooks/use-toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-6 left-1/2 z-[100] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-3 pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const isError = toast.variant === "destructive";

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDismiss, 360);
  }, [leaving, onDismiss]);

  useEffect(() => {
    if (!toast.open) return undefined;
    const timer = window.setTimeout(close, 5200);
    return () => window.clearTimeout(timer);
  }, [toast.open, close]);

  if (!toast.open && !leaving) return null;

  const Icon = isError ? AlertCircle : toast.variant === "success" ? CheckCircle2 : Info;

  return (
    <div
      role="alert"
      className={[
        "toast-shell pointer-events-auto w-full",
        leaving ? "toast-leave" : "toast-enter",
        isError ? "toast-shell-error" : "toast-shell-default",
      ].join(" ")}
    >
      <div className="toast-accent" aria-hidden="true" />
      <div className={`toast-icon-wrap ${isError ? "toast-icon-error" : "toast-icon-default"}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        {toast.description && <div className="toast-description">{toast.description}</div>}
      </div>
      <button type="button" onClick={close} className="toast-close" aria-label="Kapat">
        <X className="h-4 w-4" />
      </button>
      {!leaving && <div className={`toast-progress ${isError ? "toast-progress-error" : ""}`} />}
    </div>
  );
}
