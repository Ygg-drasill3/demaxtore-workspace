import { useRef, useState, type DragEvent } from "react";
import { FileUp, FileText, Plus, X } from "lucide-react";
import { ProductLineEditor } from "../ProductLineEditor";
import { createEmptyLine, type DirectPoLineDraft, type DirectPoWizardState } from "../../lib/direct-po-wizard.types";
import { computeSubtotal, type FieldErrors } from "../../lib/direct-po-wizard.utils";
import { cn } from "@/lib/utils";

interface Props {
  state: DirectPoWizardState;
  errors: FieldErrors;
  onChangeLines: (lines: DirectPoLineDraft[]) => void;
  onDocumentChange: (document: DirectPoWizardState["document"]) => void;
}

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export function ProductsStep({ state, errors, onChangeLines, onDocumentChange }: Props) {
  const { subtotal, allPriced } = computeSubtotal(state.lines);
  const atMax = state.lines.length >= 200;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const doc = state.document;

  const updateLine = (index: number, next: DirectPoLineDraft) => {
    onChangeLines(state.lines.map((line, i) => (i === index ? next : line)));
  };

  const duplicateLine = (index: number) => {
    if (atMax) return;
    const source = state.lines[index];
    onChangeLines([
      ...state.lines.slice(0, index + 1),
      { ...source, clientId: crypto.randomUUID() },
      ...state.lines.slice(index + 1),
    ]);
  };

  const removeLine = (index: number) => {
    if (state.lines.length <= 1) return;
    onChangeLines(state.lines.filter((_, i) => i !== index));
  };

  const addLine = () => {
    if (atMax) return;
    onChangeLines([...state.lines, createEmptyLine()]);
  };

  const acceptPdf = (file: File | null) => {
    setPdfError(null);
    if (!file) {
      onDocumentChange({ file: null, documentUrl: null, documentFileName: null });
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setPdfError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setPdfError("PDF must be 25 MB or smaller.");
      return;
    }
    onDocumentChange({ file, documentUrl: null, documentFileName: file.name });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptPdf(e.dataTransfer.files?.[0] ?? null);
  };

  const subtotalLabel = allPriced && subtotal != null
    ? `${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${state.currency}`
    : "Not specified";

  const hasPdf = Boolean(doc.file || doc.documentFileName);

  return (
    <div className="space-y-4" data-testid="direct-po-products-step">
      {errors.lines && (
        <p className="text-sm text-red-600" role="alert">{errors.lines}</p>
      )}

      <section
        className="rounded-xl border border-paper-200 bg-paper-50/60 p-4 space-y-3"
        data-testid="direct-po-pdf-upload"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Upload purchase order PDF</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Attach an existing PO PDF for automatic purchase order creation. You can still edit product lines below.
          </p>
        </div>

        {hasPdf ? (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-paper-200 bg-white px-3 py-2.5"
            data-testid="direct-po-pdf-selected"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {doc.file?.name ?? doc.documentFileName}
                </p>
                {doc.file && (
                  <p className="text-xs text-zinc-500">{(doc.file.size / 1024).toFixed(1)} KB · PDF</p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="dmx-btn-secondary text-xs inline-flex items-center gap-1 shrink-0"
              onClick={() => {
                acceptPdf(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              data-testid="direct-po-pdf-remove"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="direct-po-pdf-dropzone"
            className={cn(
              "w-full rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
              dragOver
                ? "border-accent-900 bg-accent-50/50"
                : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50",
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={onDrop}
          >
            <FileUp className="mx-auto h-7 w-7 text-zinc-400" aria-hidden />
            <p className="mt-2 text-sm font-medium text-ink-900">Drop PDF here or click to browse</p>
            <p className="mt-1 text-xs text-zinc-500">PDF only · max 25 MB</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          data-testid="direct-po-document-input"
          onChange={(e) => {
            acceptPdf(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {pdfError && (
          <p className="text-sm text-red-600" role="alert" data-testid="direct-po-pdf-error">
            {pdfError}
          </p>
        )}
      </section>

      <div className="hidden md:block dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Quality</th>
              <th className="text-left px-3 py-2">Packaging</th>
              <th className="text-left px-3 py-2">Qty</th>
              <th className="text-left px-3 py-2">Unit</th>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">Total</th>
              <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {state.lines.map((line, index) => (
              <ProductLineEditor
                key={line.clientId}
                line={line}
                index={index}
                currency={state.currency}
                errors={errors}
                onChange={(next) => updateLine(index, next)}
                onDuplicate={() => duplicateLine(index)}
                onRemove={() => removeLine(index)}
                canRemove={state.lines.length > 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {state.lines.map((line, index) => (
          <ProductLineEditor
            key={line.clientId}
            line={line}
            index={index}
            currency={state.currency}
            errors={errors}
            onChange={(next) => updateLine(index, next)}
            onDuplicate={() => duplicateLine(index)}
            onRemove={() => removeLine(index)}
            canRemove={state.lines.length > 1}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-paper-100 pt-3">
        <button
          type="button"
          className="dmx-btn-secondary text-sm inline-flex items-center gap-1"
          onClick={addLine}
          disabled={atMax}
          data-testid="add-product-line"
        >
          <Plus className="h-4 w-4" /> Add line
        </button>
        <div className="text-sm text-zinc-600 space-y-0.5 text-right">
          <p>{state.lines.length} line{state.lines.length === 1 ? "" : "s"}</p>
          <p>
            Subtotal: <span className="font-medium text-ink-900">{subtotalLabel}</span>
          </p>
          <p className="text-xs text-zinc-500">Currency: {state.currency}</p>
        </div>
      </div>
    </div>
  );
}
