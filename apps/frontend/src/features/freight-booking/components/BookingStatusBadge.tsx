import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-zinc-100 text-zinc-700 border-zinc-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-blue-50 text-blue-800 border-blue-200",
  BOOKED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REBOOK_REQUIRED: "bg-red-50 text-red-800 border-red-200",
  REBOOKED: "bg-violet-50 text-violet-800 border-violet-200",
};

export function BookingStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return (
    <span
      data-testid="booking-status-badge"
      className={cn(
        "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border",
        STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
