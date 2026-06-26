import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { SupplierDocRow } from "../../lib/supplier-command-center";

export function SupplierDocumentCenter({ rows, loading }: { rows?: SupplierDocRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="sc-documents" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.compliance")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.documents.supplierTitle")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loading")}</p>
      ) : !rows?.length ? (
        <p data-testid="sc-documents-empty" className="text-sm text-zinc-500">{t("dash.documents.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((d) => (
            <li key={d.workspaceId} data-testid="sc-doc-row" className="p-3 rounded-lg border border-zinc-100">
              <div className="flex justify-between text-sm">
                <span className="font-mono text-xs">{d.workspaceRef}</span>
                <span className="text-xs">{d.complianceStatus.replace(/_/g, " ")}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {d.missingCount > 0 && <span className="text-amber-700">{d.missingCount} missing · </span>}
                {d.rejectedCount > 0 && <span className="text-red-700">{d.rejectedCount} rejected · </span>}
                {d.approvedCount}/{d.requiredCount} approved
              </div>
              <Link to={d.workspaceUrl} data-testid={`sc-doc-open-${d.workspaceId}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.openArrow")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/supplier/trade-documents" data-testid="sc-documents-all" className="text-sm font-medium text-accent-900 hover:underline mt-4 inline-block">
        {t("dash.common.openArrow")}
      </Link>
    </section>
  );
}
