import { Link } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import type { DocumentCenterRow } from "@dmx/contracts/document-center";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { downloadAuthenticatedDocument } from "@/lib/authenticated-file";

const STATUS_STYLES: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-800",
  "Under Review": "bg-blue-50 text-blue-800",
  Uploaded: "bg-zinc-100 text-zinc-700",
  Rejected: "bg-red-50 text-red-800",
  "Revision Requested": "bg-amber-50 text-amber-800",
  Missing: "bg-orange-50 text-orange-800",
  Expired: "bg-zinc-50 text-zinc-500",
};

interface Props {
  rows: DocumentCenterRow[];
  showPoColumn?: boolean;
  emptyTestId?: string;
}

export function DocumentCenterTable({ rows, showPoColumn = true, emptyTestId = "dc-empty" }: Props) {
  const { t } = useT();
  const colSpan = showPoColumn ? 8 : 7;

  return (
    <table data-testid="dc-table" className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/80">
        <tr>
          <th className="text-left px-4 py-3">{t("documents.dc.colDocument", "Document")}</th>
          <th className="text-left px-4 py-3">{t("documents.dc.colType", "Type")}</th>
          <th className="text-left px-4 py-3">{t("documents.dc.colSource", "Source")}</th>
          {showPoColumn && (
            <th className="text-left px-4 py-3">{t("documents.dc.colPo", "PO No.")}</th>
          )}
          <th className="text-left px-4 py-3">{t("documents.dc.colRfq", "RFQ / Trade")}</th>
          <th className="text-left px-4 py-3">{t("documents.dc.colStatus", "Status")}</th>
          <th className="text-left px-4 py-3">{t("documents.dc.colUploaded", "Uploaded")}</th>
          <th className="text-left px-4 py-3">{t("documents.dc.colActions", "Actions")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={colSpan} data-testid={emptyTestId} className="px-4 py-12 text-center text-zinc-500">
              {t("documents.dc.empty", "No documents match your filters.")}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} data-testid={`dc-row-${row.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/60">
              <td className="px-4 py-3">
                <Link to={`/documents/${encodeURIComponent(row.id)}`} className="font-medium text-accent-900 hover:underline">
                  {row.documentName}
                </Link>
                <div className="text-xs text-zinc-500">v{row.version}</div>
              </td>
              <td className="px-4 py-3 text-xs">{row.category}</td>
              <td className="px-4 py-3 text-xs">{row.source}</td>
              {showPoColumn && (
                <td className="px-4 py-3 text-xs font-mono">
                  {row.poNumber ? (
                    row.orderWorkspaceUrl ? (
                      <Link to={row.orderWorkspaceUrl} className="text-accent-900 hover:underline">
                        {row.poNumber}
                      </Link>
                    ) : (
                      row.poNumber
                    )
                  ) : (
                    <span className="text-zinc-400">{t("documents.dc.prePo", "Pre-PO")}</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-xs">{row.tradeId ?? row.relatedEntityRef ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[row.status] ?? "bg-zinc-100")}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs tabular-nums">
                {row.uploadedAt ? new Date(row.uploadedAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link to={`/documents/${encodeURIComponent(row.id)}`} className="text-xs text-accent-900 hover:underline inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {t("documents.preview")}
                  </Link>
                  {row.downloadUrl && (
                    <button
                      type="button"
                      className="text-xs text-accent-900 hover:underline inline-flex items-center gap-1"
                      onClick={() => void downloadAuthenticatedDocument(row.downloadUrl!, row.documentName)}
                    >
                      <Download className="h-3 w-3" /> {t("documents.download")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
