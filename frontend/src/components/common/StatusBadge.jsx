import React from "react";
import { cn } from "@/lib/utils";

const STYLES = {
  INFO: "bg-blue-50 text-blue-700 border-blue-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  ERROR: "bg-red-50 text-red-700 border-red-200",
  NEUTRAL: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function StatusBadge({ type = "NEUTRAL", children, className, ...rest }) {
  return (
    <span
      data-testid={`status-badge-${String(type).toLowerCase()}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border tracking-wide",
        STYLES[type] || STYLES.NEUTRAL,
        className
      )}
      {...rest}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full",
        type === "INFO" && "bg-blue-500",
        type === "SUCCESS" && "bg-emerald-500",
        type === "WARNING" && "bg-amber-500",
        type === "ERROR" && "bg-red-500",
        (!type || type === "NEUTRAL") && "bg-zinc-400"
      )} />
      {children}
    </span>
  );
}

export default StatusBadge;
