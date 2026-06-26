import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";
import type { ExecutionRow } from "../../lib/supplier-command-center";

export function ExecutionCenter({ rows, loading }: { rows?: ExecutionRow[]; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="sc-execution-center" className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.workload")}</span>
        <h2 className="font-display text-xl font-semibold mt-0.5">{t("dash.execution.title")}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">{t("dash.common.reference")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.type")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.stage")}</th>
              <th className="text-left px-4 py-3">{t("dash.common.nextAction")}</th>
              <th className="text-right px-4 py-3">{t("dash.common.open")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">{t("dash.common.loading")}</td></tr>
            ) : !rows?.length ? (
              <tr>
                <td colSpan={5} data-testid="sc-execution-empty" className="px-4 py-10 text-center text-zinc-500">
                  No active POs, orders, or shipments.
                </td>
              </tr>
            ) : rows.map((r) => (
              <tr key={`${r.type}-${r.id}`} data-testid={`sc-execution-${r.type}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">{r.stage}</td>
                <td className="px-4 py-3 text-zinc-600">{r.nextAction}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={r.workspaceUrl} data-testid={`sc-execution-open-${r.id}`} className="text-sm font-medium text-blue-900 hover:underline">{t("dash.common.open")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
