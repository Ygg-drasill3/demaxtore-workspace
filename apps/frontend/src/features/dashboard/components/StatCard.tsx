// apps/frontend/src/features/dashboard/components/StatCard.tsx
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label:    string;
  value:    string | number;
  hint?:    string;
  icon?:    LucideIcon;
  tone?:    "default" | "accent" | "success" | "warning";
  testId?:  string;
}

const TONE: Record<NonNullable<Props["tone"]>, { iconBg: string; iconText: string }> = {
  default: { iconBg: "bg-paper-100",   iconText: "text-ink-900" },
  accent:  { iconBg: "bg-accent-50",    iconText: "text-accent-900" },
  success: { iconBg: "bg-emerald-50",   iconText: "text-emerald-700" },
  warning: { iconBg: "bg-amber-50",     iconText: "text-amber-700" },
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", testId }: Props) {
  const t = TONE[tone];
  return (
    <div data-testid={testId} className="dmx-card dmx-card-hover p-5 flex items-start gap-4">
      {Icon && (
        <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", t.iconBg, t.iconText)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="dmx-eyebrow truncate">{label}</div>
        <div className="font-display text-3xl font-semibold tracking-tight mt-1 leading-none">{value}</div>
        {hint && <div className="text-xs text-zinc-500 mt-1.5">{hint}</div>}
      </div>
    </div>
  );
}
