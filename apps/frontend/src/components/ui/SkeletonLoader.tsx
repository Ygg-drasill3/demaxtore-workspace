// apps/frontend/src/components/ui/SkeletonLoader.tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-paper-200/70", className)} />;
}

/** Pre-composed skeleton for the RFQ workspace right column. */
export function WorkspaceSkeleton() {
  return (
    <div data-testid="workspace-skeleton" className="space-y-5 animate-fade-in">
      <div className="dmx-card p-7 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <div className="flex gap-3 mt-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="dmx-card p-4 flex gap-3">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-7 flex-1" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

/** Generic page-level skeleton for lazy route Suspense fallbacks. */
export function PageSkeleton() {
  return (
    <div data-testid="page-skeleton" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/** Skeleton row for table-style lists. */
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-t border-paper-200">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4"><Skeleton className="h-4 w-3/4" /></td>
      ))}
    </tr>
  );
}
