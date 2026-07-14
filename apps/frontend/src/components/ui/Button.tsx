// apps/frontend/src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes, type MutableRefObject } from "react";
import { m } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { springMicro } from "@/motion/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize    = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
  /** Subtle cursor attraction on primary actions */
  magnetic?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:    "bg-accent-900 text-white hover:bg-accent-600 active:bg-ink-900",
  secondary:  "bg-white text-ink-900 border border-paper-200 hover:bg-paper-50 active:bg-paper-100",
  ghost:      "bg-transparent text-ink-800 hover:bg-paper-100",
  destructive:"bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, magnetic, className, children, disabled, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const useMag = magnetic ?? variant === "primary";
  const mag = useMagnetic<HTMLButtonElement>({ strength: 0.18, maxOffset: 6 });

  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium overflow-hidden dmx-focus-ring",
    "disabled:opacity-60 disabled:cursor-not-allowed dmx-motion-gpu",
    variant === "primary" && !reduced && "dmx-btn-shine",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  const shared = {
    disabled: loading || disabled,
    className: classes,
    onMouseMove: useMag && !reduced ? mag.onMouseMove : undefined,
    onMouseLeave: useMag && !reduced ? mag.onMouseLeave : undefined,
    ...rest,
  };

  if (reduced) {
    return (
      <button ref={ref} {...shared}>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  }

  const testId = (rest as Record<string, unknown>)["data-testid"] as string | undefined;

  return (
    <m.button
      ref={(node) => {
        (mag.ref as MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      disabled={shared.disabled}
      className={shared.className}
      onMouseMove={shared.onMouseMove}
      onMouseLeave={shared.onMouseLeave}
      onClick={rest.onClick}
      type={rest.type}
      form={rest.form}
      name={rest.name}
      value={rest.value}
      aria-label={rest["aria-label"]}
      data-testid={testId}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={springMicro}
    >
      {loading ? (
        <m.span
          key="loading"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {children}
        </m.span>
      ) : (
        children
      )}
    </m.button>
  );
});
