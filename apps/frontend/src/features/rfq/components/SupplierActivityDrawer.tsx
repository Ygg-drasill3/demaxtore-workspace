// apps/frontend/src/features/rfq/components/SupplierActivityDrawer.tsx
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useSupplierActivityDetail, useNudgeSupplier } from "../hooks/useSupplierActivity";
import { formatRelative } from "@/lib/utils";
import { CheckCircle2, MapPin, Users } from "lucide-react";
import type { SupplierActivityRow, SupplierEngagementStage } from "@dmx/contracts/supplier-activity";

interface Props {
  workspaceId: string;
  open:        boolean;
  onClose:     () => void;
}

const STAGE_TO_DOTS: Record<SupplierEngagementStage, number> = {
  INVITED: 1, VIEWED: 2, RETURNED: 3, QUOTED: 4, DECLINED: 4,
};

const STAGE_LABEL: Record<SupplierEngagementStage, string> = {
  INVITED: "Invited", VIEWED: "Viewed", RETURNED: "Returned", QUOTED: "Quoted", DECLINED: "Declined",
};

export function SupplierActivityDrawer({ workspaceId, open, onClose }: Props) {
  const { data, isLoading } = useSupplierActivityDetail(workspaceId, { enabled: open });
  const nudge = useNudgeSupplier(workspaceId);

  return (
    <Drawer open={open} onClose={onClose} title="Per-supplier activity" width="lg" testId="supplier-activity-drawer">
      <div className="px-5 py-4 space-y-3">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : data.rows.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No suppliers yet"
                      body="Suppliers will appear here once DeMaxtore assigns them." />
        ) : (
          data.rows.map((row) => (
            <Row key={row.supplierId} row={row}
                 onNudge={() => nudge.mutate(row.supplierId)}
                 nudging={nudge.isPending && nudge.variables === row.supplierId} />
          ))
        )}
      </div>
    </Drawer>
  );
}

function Row({ row, onNudge, nudging }: { row: SupplierActivityRow; onNudge: () => void; nudging: boolean }) {
  const dots = row.engagementDots || STAGE_TO_DOTS[row.stage];
  return (
    <div data-testid={`supplier-row-${row.supplierId}`}
         className="dmx-card p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900 truncate">{row.supplierName}</span>
            <EngagementDots filled={dots} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 mt-1">
            {row.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{row.location}</span>
            )}
            {row.verifiedSince && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />Verified since {new Date(row.verifiedSince).getFullYear()}
              </span>
            )}
            <span>{row.pastPoCount} past {row.pastPoCount === 1 ? "PO" : "POs"}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <Badge tone={row.stage === "DECLINED" ? "danger" : row.stage === "QUOTED" ? "success" : "neutral"} dot>
            {STAGE_LABEL[row.stage]}
          </Badge>
          {row.lastActivityAt && (
            <div className="text-[10px] text-zinc-400 mt-1.5">{formatRelative(row.lastActivityAt)}</div>
          )}
        </div>
      </div>

      {row.stage === "QUOTED" && row.quotedTotal != null && (
        <div data-testid={`supplier-row-quoted-${row.supplierId}`}
             className="text-sm font-medium text-emerald-800 tabular-nums">
          Quoted: {row.quotedTotal.toLocaleString()}
        </div>
      )}

      {row.stage === "DECLINED" && row.declineReason && (
        <blockquote data-testid={`supplier-row-reason-${row.supplierId}`}
                    className="text-xs text-zinc-600 border-l-2 border-red-200 pl-2.5 italic">
          "{row.declineReason}"
        </blockquote>
      )}

      {row.canNudge && (
        <Button
          data-testid={`supplier-row-nudge-${row.supplierId}`}
          variant="ghost"
          size="sm"
          className="self-start"
          loading={nudging}
          onClick={onNudge}
        >
          Nudge {row.supplierName}
        </Button>
      )}
    </div>
  );
}

function EngagementDots({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Engagement: ${filled} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i}
              className={`h-1.5 w-1.5 rounded-full ${i < filled ? "bg-accent-900" : "bg-paper-200"}`} />
      ))}
    </div>
  );
}
