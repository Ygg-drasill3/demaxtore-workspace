// apps/frontend/src/components/ui/Badge.tsx
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral" | "info" | "success" | "warning" | "danger" | "accent" | "violet" | "amber";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?:  boolean;
}

const TONES: Record<BadgeTone, { wrap: string; dot: string }> = {
  neutral: { wrap: "bg-paper-100 text-ink-800 border-paper-200", dot: "bg-zinc-400" },
  info:    { wrap: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  success: { wrap: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  warning: { wrap: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  danger:  { wrap: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  accent:  { wrap: "bg-accent-50 text-accent-900 border-accent-900/15", dot: "bg-accent-900" },
  violet:  { wrap: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  amber:   { wrap: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
};

export function Badge({ tone = "neutral", dot, className, children, ...rest }: Props) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border tracking-wide",
        t.wrap, className,
      )}
      {...rest}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
