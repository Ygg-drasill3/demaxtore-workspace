import { FileText, X } from "lucide-react";
import type { DirectPoWizardState } from "../../lib/direct-po-wizard.types";

interface Props {
  state: DirectPoWizardState;
  onDocumentChange: (document: DirectPoWizardState["document"]) => void;
  uploadError?: string | null;
  uploading?: boolean;
}

export function DocumentsStep({ state, onDocumentChange, uploadError, uploading }: Props) {
  const doc = state.document;

  const handleFile = (file: File | null) => {
    if (!file) {
      onDocumentChange({ file: null, documentUrl: null, documentFileName: null });
      return;
    }
    onDocumentChange({ file, documentUrl: null, documentFileName: file.name });
  };

  return (
    <div className="space-y-4" data-testid="direct-po-documents-step">
      <p className="text-sm text-zinc-600">
        Optionally attach a supporting PDF (or upload it earlier on the Products step). The file is saved when you create the purchase order.
      </p>

      {doc.file || doc.documentFileName ? (
        <div className="dmx-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{doc.file?.name ?? doc.documentFileName}</p>
              {doc.file && (
                <p className="text-xs text-zinc-500">{(doc.file.size / 1024).toFixed(1)} KB</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="dmx-btn-secondary text-xs inline-flex items-center gap-1"
            onClick={() => handleFile(null)}
            disabled={uploading}
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <label className="block">
          <span className="sr-only">Upload document</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-paper-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-paper-200"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            data-testid="direct-po-document-input"
          />
        </label>
      )}

      {uploading && <p className="text-sm text-zinc-500">Uploading document…</p>}
      {uploadError && <p className="text-sm text-red-600" role="alert">{uploadError}</p>}
    </div>
  );
}
