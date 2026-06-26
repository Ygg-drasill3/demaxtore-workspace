// apps/frontend/src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize    = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
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
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors dmx-focus-ring",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
});
