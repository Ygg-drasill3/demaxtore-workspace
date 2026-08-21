import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { DocumentStatusRow } from "../../lib/buyer-command-center";
import { displayRef } from "../../lib/display-ref";

export function DocumentStatusWidget({ rows, loading }: { rows?: DocumentStatusRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="cc-documents" className="dmx-card p-5">
      <h2 className="font-display text-xl font-semibold mb-4">{t("dash.documents.title")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingDocuments")}</p>
      ) : !rows?.length ? (
        <p data-testid="cc-documents-empty" className="text-sm text-zinc-500">{t("dash.documents.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((d) => (
            <li key={d.workspaceId} data-testid="cc-doc-row" className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{displayRef(d.workspaceRef)}</span>
                <span className={`text-xs ${d.complianceStatus === "READY_FOR_SHIPMENT" ? "text-emerald-700" : "text-zinc-600"}`}>
                  {d.complianceStatus.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {d.approvedCount}/{d.requiredCount} approved
                {d.missingCount > 0 && <span className="text-amber-700 ml-2">{d.missingCount} missing</span>}
                {d.pendingReview > 0 && <span className="text-blue-800 ml-2">{d.pendingReview} pending review</span>}
              </div>
              <Link to={d.workspaceUrl} data-testid={`cc-doc-open-${d.workspaceId}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/buyer/trade-documents" data-testid="cc-documents-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
