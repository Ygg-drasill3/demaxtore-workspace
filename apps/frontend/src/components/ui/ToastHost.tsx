// apps/frontend/src/components/ui/ToastHost.tsx
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useToast } from "@/store/toast.store";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@dmx/contracts/notifications";

const ICON: Record<NotificationType, JSX.Element> = {
  INFO:    <Info        className="h-4 w-4" />,
  SUCCESS: <CheckCircle2 className="h-4 w-4" />,
  WARNING: <AlertTriangle className="h-4 w-4" />,
  ERROR:   <AlertCircle  className="h-4 w-4" />,
};

const RING: Record<NotificationType, string> = {
  INFO:    "border-l-blue-500",
  SUCCESS: "border-l-emerald-500",
  WARNING: "border-l-amber-500",
  ERROR:   "border-l-red-500",
};

const ICON_COLOR: Record<NotificationType, string> = {
  INFO:    "text-blue-600",
  SUCCESS: "text-emerald-600",
  WARNING: "text-amber-600",
  ERROR:   "text-red-600",
};

/**
 * Stacked top-right toast region. Rendered once at the app root.
 * Replaces the `sonner` library — keeps zero extra deps.
 */
export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div data-testid="toast-host" aria-live="polite" aria-atomic="true"
         className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={`toast-${t.id}`}
          role="status"
          className={cn(
            "pointer-events-auto bg-white rounded-lg shadow-card border border-paper-200 border-l-4",
            "px-3.5 py-3 flex items-start gap-3 animate-slide-in",
            RING[t.type],
          )}
        >
          <div className={cn("mt-0.5", ICON_COLOR[t.type])}>{ICON[t.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-900 truncate">{t.title}</div>
            {t.body && <div className="text-xs text-zinc-600 mt-0.5">{t.body}</div>}
          </div>
          <button onClick={() => remove(t.id)} aria-label="Dismiss"
                  className="text-zinc-400 hover:text-zinc-700 -mr-0.5"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}
