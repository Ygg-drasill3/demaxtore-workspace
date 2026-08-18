import type { OperationalEventCategory, OperationalEventSeverity } from "@dmx/contracts/operational-timeline";
import { operationalEventCategoryLabel } from "@dmx/contracts/operational-timeline";

export function categoryBadgeClass(category: OperationalEventCategory): string {
  switch (category) {
    case "REVISION":
      return "bg-violet-50 text-violet-800 border-violet-100";
    case "DOCUMENT":
      return "bg-sky-50 text-sky-800 border-sky-100";
    case "INSPECTION":
      return "bg-amber-50 text-amber-900 border-amber-100";
    case "SHIPMENT":
      return "bg-cyan-50 text-cyan-900 border-cyan-100";
    case "APPROVAL":
      return "bg-emerald-50 text-emerald-800 border-emerald-100";
    case "PURCHASE_ORDER":
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
    case "TRADE":
      return "bg-orange-50 text-orange-900 border-orange-100";
    default:
      return "bg-zinc-50 text-zinc-600 border-zinc-200";
  }
}

export function severityDotClass(severity?: OperationalEventSeverity | null): string {
  switch (severity) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-zinc-400";
  }
}

export function formatAbsoluteTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(minutes, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (abs < 86_400_000) return rtf.format(hours, "hour");
  const days = Math.round(diffMs / 86_400_000);
  if (abs < 86_400_000 * 30) return rtf.format(days, "day");
  return formatAbsoluteTime(iso);
}

export { operationalEventCategoryLabel };
