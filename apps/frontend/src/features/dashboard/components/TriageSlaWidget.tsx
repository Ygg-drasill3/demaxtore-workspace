// apps/frontend/src/features/dashboard/components/TriageSlaWidget.tsx
//
// Sprint 2.5 — Phase 14: Admin SLA widget.
// Surface operational health: how many RFQs are sitting in the triage queue,
// average assignment time, and aged outliers (>24h / >48h).
//
import { Card, CardHeader, CardTitle, CardEyebrow, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TriageSlaData {
  newRfqs:               number;
  pendingAssignment:     number;
  avgAssignmentHours:    number;
  countOver24h:          number;
  countOver48h:          number;
}

interface Props { data: TriageSlaData; }

export function TriageSlaWidget({ data }: Props) {
  const sev =
    data.countOver48h > 0 ? "danger"  :
    data.countOver24h > 0 ? "warning" :
    data.pendingAssignment > 0 ? "neutral" : "success";

  return (
    <Card data-testid="triage-sla-widget" className={cn(
      sev === "danger"  && "ring-1 ring-red-200",
      sev === "warning" && "ring-1 ring-amber-200",
    )}>
      <CardHeader>
        <div>
          <CardEyebrow>Admin · Triage SLA</CardEyebrow>
          <CardTitle className="mt-1">Operational visibility</CardTitle>
        </div>
        {sev === "danger"  && <Badge tone="danger"  dot>SLA breach</Badge>}
        {sev === "warning" && <Badge tone="warning" dot>Approaching SLA</Badge>}
        {sev === "success" && <Badge tone="success" dot>All clear</Badge>}
      </CardHeader>

      <CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Cell testId="triage-new"       label="New RFQs"           value={data.newRfqs}                              icon={<Clock className="h-3.5 w-3.5" />} />
          <Cell testId="triage-pending"   label="Pending assignment" value={data.pendingAssignment}                    />
          <Cell testId="triage-avg"       label="Avg assign time"     value={`${data.avgAssignmentHours.toFixed(1)}h`} />
          <Cell testId="triage-over-24"   label="Over 24h"            value={data.countOver24h} tone={data.countOver24h > 0 ? "warning" : "default"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <Cell testId="triage-over-48"   label="Over 48h"            value={data.countOver48h} tone={data.countOver48h > 0 ? "danger"  : "default"} icon={<AlertOctagon className="h-3.5 w-3.5" />} />
        </div>
      </CardBody>
    </Card>
  );
}

interface CellProps {
  testId: string;
  label:  string;
  value:  number | string;
  icon?:  React.ReactNode;
  tone?:  "default" | "warning" | "danger";
}

const TONE_STYLES = {
  default: "bg-paper-50 border-paper-200 text-ink-900",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  danger:  "bg-red-50 border-red-200 text-red-700",
} as const;

function Cell({ testId, label, value, icon, tone = "default" }: CellProps) {
  return (
    <div data-testid={testId} className={cn("rounded-lg border px-3 py-2.5", TONE_STYLES[tone])}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
        {icon}{label}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums leading-none mt-1.5">{value}</div>
    </div>
  );
}
