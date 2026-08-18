import React from "react";
import { cn } from "@/lib/utils";

export function WidgetCard({ label, value, delta, icon: Icon, hint, testId, className }) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "dmx-card p-5 flex flex-col gap-4 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.12)] transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="dmx-label">{label}</span>
        {Icon ? (
          <span className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="font-display text-4xl font-semibold tracking-tight text-zinc-950">
          {value}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{delta}</span>
        {hint ? <span className="text-zinc-400">{hint}</span> : null}
      </div>
    </div>
  );
}

export default WidgetCard;
