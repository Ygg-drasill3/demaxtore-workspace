import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import type { RfqPdfSource } from "../lib/rfqPdf";
import { downloadRfqPdf, openRfqPdf } from "../lib/rfqPdf";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

type Props = {
  rfq: RfqPdfSource;
  variant?: "header" | "compact";
};

export function RfqPdfButton({ rfq, variant = "header" }: Props) {
  const { t } = useT();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  const handleView = async () => {
    setBusy("view");
    try {
      await openRfqPdf(rfq);
    } catch {
      toast.error(t("rfq.pdf.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      await downloadRfqPdf(rfq);
      toast.success(t("rfq.pdf.downloaded"));
    } catch {
      toast.error(t("rfq.pdf.error"));
    } finally {
      setBusy(null);
    }
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        data-testid="rfq-pdf-view"
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-ink-900 disabled:opacity-50"
        onClick={() => void handleView()}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        {t("rfq.pdf.view")}
      </button>
    );
  }

  return (
    <div
      data-testid="rfq-pdf-actions"
      className="inline-flex items-stretch rounded-lg overflow-hidden shadow-sm border border-slate-200/80 bg-white"
    >
      <button
        type="button"
        data-testid="rfq-pdf-view"
        disabled={!!busy}
        onClick={() => void handleView()}
        className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-all"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)",
        }}
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "linear-gradient(135deg, #1e293b 0%, #2563eb 100%)" }}
        />
        <span className="relative inline-flex items-center gap-2">
          {busy === "view" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {t("rfq.pdf.view")}
        </span>
      </button>
      <button
        type="button"
        data-testid="rfq-pdf-download"
        disabled={!!busy}
        onClick={() => void handleDownload()}
        title={t("rfq.pdf.download")}
        className="inline-flex items-center justify-center px-3 py-2 text-slate-600 hover:text-ink-900 hover:bg-slate-50 border-l border-slate-200/80 disabled:opacity-60 transition-colors"
      >
        {busy === "download" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
