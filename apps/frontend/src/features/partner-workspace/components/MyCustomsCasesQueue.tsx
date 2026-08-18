import { Link } from "react-router-dom";
import type { PartnerCustomsCaseSummaryDto } from "@dmx/contracts/partner-workspace";

const QUEUE_GROUP_LABEL: Record<string, string> = {
  ACTION_REQUIRED: "Action required",
  ARRIVING_SOON: "Arriving soon",
  READY_FOR_REVIEW: "Ready for review",
  UNDER_REVIEW: "Under review",
  DECLARATION_PREPARING: "Declaration preparing",
  FILED_PROCESSING: "Filed / processing",
  HOLD: "Hold",
  CLEARED: "Cleared",
};

function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function caseTitle(c: PartnerCustomsCaseSummaryDto): string {
  return c.shipmentRef?.trim() || c.importerLabel?.trim() || "Assigned customs case";
}

function groupCases(cases: PartnerCustomsCaseSummaryDto[]) {
  const groups: Array<{ key: string; label: string; items: PartnerCustomsCaseSummaryDto[] }> = [];
  for (const c of cases) {
    const key = c.queueGroup ?? "READY_FOR_REVIEW";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(c);
    } else {
      groups.push({ key, label: QUEUE_GROUP_LABEL[key] ?? humanize(key), items: [c] });
    }
  }
  return groups;
}

export function MyCustomsCasesQueue({
  cases,
  heading = "My Customs Cases",
  showViewAll = false,
}: {
  cases: PartnerCustomsCaseSummaryDto[];
  heading?: string;
  showViewAll?: boolean;
}) {
  const groups = groupCases(cases);

  return (
    <section className="space-y-3" data-testid="my-customs-cases" id="my-customs-cases">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{heading}</h2>
        {showViewAll && (
          <Link className="text-sm underline" to="/partner/customs" data-testid="my-customs-cases-view-all">
            View all
          </Link>
        )}
      </div>

      {cases.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="my-customs-cases-empty">
          No assigned customs cases yet.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="space-y-1" data-testid={`customs-queue-group-${g.key}`}>
              {groups.length > 1 && (
                <p className="text-xs uppercase tracking-wide text-zinc-500 px-1">{g.label}</p>
              )}
              <ul className="divide-y rounded-lg border">
                {g.items.map((c) => (
                  <li
                    key={c.customsCaseId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    data-testid={`customs-case-row-${c.shipmentRef ?? c.customsCaseId}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid="customs-case-title">
                        {caseTitle(c)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {humanize(c.customsStatus)}
                        {c.importerLabel ? ` · ${c.importerLabel}` : ""}
                        {c.destinationPort ? ` · ${c.destinationPort}` : ""}
                        {c.eta ? ` · ETA ${new Date(c.eta).toLocaleDateString()}` : ""}
                        {c.daysToArrival != null ? ` · ${c.daysToArrival} days to arrival` : ""}
                        {c.readinessStatus ? ` · ${humanize(c.readinessStatus)}` : ""}
                        {c.urgency ? ` · ${humanize(c.urgency)}` : ""}
                        {c.nextAction ? ` · Next: ${c.nextAction}` : ""}
                      </p>
                    </div>
                    <Link
                      className="shrink-0 underline"
                      to={`/partner/customs/${c.customsCaseId}`}
                      data-testid={`open-customs-case-${c.shipmentRef ?? c.customsCaseId}`}
                    >
                      Open Case
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
