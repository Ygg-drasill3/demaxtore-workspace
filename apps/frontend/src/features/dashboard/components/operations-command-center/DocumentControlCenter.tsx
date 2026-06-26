import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { DocumentOpsRow } from "../../lib/operations-command-center";

export function DocumentControlCenter({ rows, loading }: { rows?: DocumentOpsRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section id="oc-documents" data-testid="oc-documents" className="dmx-card p-5">
      <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.compliance")}</span>
      <h2 className="font-display text-xl font-semibold mt-0.5 mb-4">{t("dash.documents.controlTitle")}</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">{t("dash.common.loadingDocuments")}</p>
      ) : !rows?.length ? (
        <p data-testid="oc-documents-empty" className="text-sm text-zinc-500">{t("dash.documents.controlEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => (
            <li key={d.workspaceId} data-testid="oc-doc-row" className="p-3 rounded-lg border border-zinc-100">
              <span className="font-mono text-xs">{d.workspaceRef}</span>
              <span className="ml-2 text-[10px] uppercase text-zinc-400">{d.workspaceType}</span>
              <p className="text-sm mt-1">{d.issue}</p>
              <Link to={d.workspaceUrl} data-testid={`oc-doc-open-${d.workspaceId}`} className="text-sm font-medium text-blue-900 hover:underline mt-2 inline-block">
                {t("dash.common.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
