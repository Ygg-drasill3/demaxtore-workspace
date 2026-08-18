import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  COMMERCIAL_DOCUMENT_CATEGORIES,
  COMMERCIAL_DOCUMENT_SOURCES,
  type CommercialDocumentCategory,
  type CommercialDocumentDto,
  type CommercialDocumentSource,
} from "@dmx/contracts/commercial-document";
import { commercialDocumentApi } from "../../lib/commercial-document.api";
import { purchaseOrderKeys } from "../../lib/purchase-order.query-keys";
import { getApiErrorMessage } from "@/lib/api-errors";
import { Drawer } from "@/components/ui/Drawer";
import {
  canInlinePreview,
  commercialCategoryLabel,
  commercialSourceLabel,
  formatDocUploadedAt,
  formatFileSize,
} from "./document-formatters";

type Props = {
  purchaseOrderId: string;
  canUpload?: boolean;
  focusDocumentId?: string | null;
  onFocusDocumentConsumed?: () => void;
  /** When set, locks source filter (e.g. SHIPMENT on shipment workspace). */
  fixedSource?: CommercialDocumentSource;
  allowedCategories?: CommercialDocumentCategory[];
};

export function CommercialDocumentCenter({
  purchaseOrderId,
  canUpload = true,
  focusDocumentId = null,
  onFocusDocumentConsumed,
  fixedSource,
  allowedCategories,
}: Props) {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<CommercialDocumentDto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<CommercialDocumentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommercialDocumentDto | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categoryOptions = allowedCategories?.length
    ? allowedCategories
    : [...COMMERCIAL_DOCUMENT_CATEGORIES];

  const filters = useMemo(
    () => ({
      category: params.get("documentCategory") || undefined,
      source: fixedSource ?? (params.get("documentSource") || undefined),
      search: params.get("documentSearch") || undefined,
      page: 1,
      pageSize: 50,
    }),
    [params, fixedSource],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: purchaseOrderKeys.documents(purchaseOrderId, filters),
    queryFn: () => commercialDocumentApi.list(purchaseOrderId, filters),
    retry: false,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: purchaseOrderKeys.documents(purchaseOrderId) });
    await qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(purchaseOrderId) });
    await qc.invalidateQueries({ queryKey: purchaseOrderKeys.timeline(purchaseOrderId) });
  };

  useEffect(() => {
    if (!focusDocumentId || !data?.items) return;
    const found = data.items.find((d) => d.id === focusDocumentId);
    if (found) setSelected(found);
    onFocusDocumentConsumed?.();
  }, [focusDocumentId, data?.items, onFocusDocumentConsumed]);

  const uploadMut = useMutation({
    mutationFn: (input: { file: File; category: string; title?: string }) =>
      commercialDocumentApi.upload(
        purchaseOrderId,
        input.file,
        { category: input.category as never, title: input.title },
        setUploadPct,
      ),
    onSuccess: async () => {
      setUploadOpen(false);
      setUploadPct(null);
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setUploadPct(null);
      setActionError(getApiErrorMessage(err, "Upload failed"));
    },
  });

  const replaceMut = useMutation({
    mutationFn: (input: { doc: CommercialDocumentDto; file: File }) =>
      commercialDocumentApi.replace(purchaseOrderId, input.doc.id, input.file, undefined, setUploadPct),
    onSuccess: async () => {
      setReplaceTarget(null);
      setUploadPct(null);
      setSelected(null);
      await invalidate();
    },
    onError: (err) => {
      setUploadPct(null);
      setActionError(getApiErrorMessage(err, "Replace failed"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (doc: CommercialDocumentDto) =>
      commercialDocumentApi.remove(purchaseOrderId, doc.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelected(null);
      await invalidate();
    },
    onError: (err) => setActionError(getApiErrorMessage(err, "Delete failed")),
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const items = data?.items ?? [];
  const filteredEmpty = !isLoading && !isError && items.length === 0 && Boolean(
    filters.category || filters.source || filters.search,
  );
  const empty = !isLoading && !isError && items.length === 0 && !filteredEmpty;

  return (
    <section
      data-testid="po-commercial-documents"
      className="dmx-card p-4 space-y-4"
      aria-labelledby="po-commercial-docs-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="po-commercial-docs-heading" className="font-medium">
            Commercial Documents
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Purchase Order, invoices, packing lists, shipping and inspection files in one place.
          </p>
        </div>
        {canUpload ? (
          <button
            type="button"
            data-testid="po-doc-upload"
            className="dmx-btn-primary text-sm"
            onClick={() => setUploadOpen(true)}
          >
            Upload Document
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="po-doc-filters">
        <label className="text-xs text-zinc-600 space-y-1">
          <span>Category</span>
          <select
            data-testid="po-doc-filter-category"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={filters.category ?? ""}
            onChange={(e) => setFilter("documentCategory", e.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{commercialCategoryLabel(c)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-600 space-y-1">
          <span>Source</span>
          <select
            data-testid="po-doc-filter-source"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={filters.source ?? ""}
            disabled={!!fixedSource}
            onChange={(e) => setFilter("documentSource", e.target.value)}
          >
            <option value="">All sources</option>
            {COMMERCIAL_DOCUMENT_SOURCES.map((s) => (
              <option key={s} value={s}>{commercialSourceLabel(s)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-600 space-y-1">
          <span>Search</span>
          <input
            data-testid="po-doc-filter-search"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={filters.search ?? ""}
            placeholder="Filename, title, reference…"
            onChange={(e) => setFilter("documentSearch", e.target.value)}
          />
        </label>
      </div>

      {actionError ? (
        <p className="text-sm text-rose-700" data-testid="po-doc-action-error">{actionError}</p>
      ) : null}

      {isLoading || (isFetching && !data) ? (
        <div data-testid="po-doc-skeleton" className="space-y-2 animate-pulse" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-zinc-100" />)}
        </div>
      ) : null}

      {isError ? (
        <div data-testid="po-doc-error" className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-sm text-rose-900">Unable to load commercial documents.</p>
          <button type="button" className="text-sm underline" data-testid="po-doc-retry" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {empty ? (
        <div data-testid="po-doc-empty" className="text-sm text-zinc-500 space-y-1">
          <p>No commercial documents yet.</p>
          <p className="text-zinc-400">
            Upload invoices, packing lists, shipping documents, and other files related to this Purchase Order.
          </p>
        </div>
      ) : null}

      {filteredEmpty ? (
        <div data-testid="po-doc-filtered-empty" className="text-sm text-zinc-500 space-y-2">
          <p>No documents match the selected filters.</p>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete("documentCategory");
              next.delete("documentSource");
              next.delete("documentSearch");
              setParams(next, { replace: true });
            }}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && items.length > 0 ? (
        <>
          <div className="hidden md:block overflow-x-auto" data-testid="po-doc-table">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">File</th>
                  <th className="py-2 pr-2">Source</th>
                  <th className="py-2 pr-2">Uploaded</th>
                  <th className="py-2 pr-2">Size</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((doc) => (
                  <tr key={doc.id} className="border-t border-zinc-100" data-testid={`po-doc-row-${doc.id}`}>
                    <td className="py-2 pr-2">{commercialCategoryLabel(doc.category)}</td>
                    <td className="py-2 pr-2">
                      <button type="button" className="text-left font-medium hover:underline break-all" onClick={() => setSelected(doc)}>
                        {doc.title || doc.fileName}
                      </button>
                    </td>
                    <td className="py-2 pr-2 text-zinc-600">{commercialSourceLabel(doc.source)}</td>
                    <td className="py-2 pr-2 text-zinc-600">{formatDocUploadedAt(doc.uploadedAt)}</td>
                    <td className="py-2 pr-2 tabular-nums">{formatFileSize(doc.fileSize)}</td>
                    <td className="py-2">
                      <DocActions
                        doc={doc}
                        onOpen={() => setSelected(doc)}
                        onReplace={() => setReplaceTarget(doc)}
                        onDelete={() => setDeleteTarget(doc)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2" data-testid="po-doc-cards">
            {items.map((doc) => (
              <li key={doc.id} className="rounded-lg border border-zinc-200 p-3 space-y-2">
                <button type="button" className="text-left w-full" onClick={() => setSelected(doc)}>
                  <p className="text-xs text-zinc-500">{commercialCategoryLabel(doc.category)}</p>
                  <p className="font-medium break-words">{doc.title || doc.fileName}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {commercialSourceLabel(doc.source)} · {formatDocUploadedAt(doc.uploadedAt)}
                  </p>
                </button>
                <DocActions
                  doc={doc}
                  onOpen={() => setSelected(doc)}
                  onReplace={() => setReplaceTarget(doc)}
                  onDelete={() => setDeleteTarget(doc)}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? (selected.title || selected.fileName) : "Document"}
        width="lg"
        testId="po-doc-drawer"
      >
        {selected ? (
          <div className="p-5 space-y-4">
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-zinc-500">Category</dt>
              <dd>{commercialCategoryLabel(selected.category)}</dd>
              <dt className="text-zinc-500">Source</dt>
              <dd>{commercialSourceLabel(selected.source)}</dd>
              <dt className="text-zinc-500">Uploaded</dt>
              <dd>{formatDocUploadedAt(selected.uploadedAt)}</dd>
              <dt className="text-zinc-500">Uploader</dt>
              <dd>{selected.uploadedBy?.name ?? "—"}</dd>
              <dt className="text-zinc-500">Size</dt>
              <dd>{formatFileSize(selected.fileSize)}</dd>
              {selected.referenceNumber ? (
                <>
                  <dt className="text-zinc-500">Reference</dt>
                  <dd>{selected.referenceNumber}</dd>
                </>
              ) : null}
            </dl>
            {selected.canPreview && canInlinePreview(selected.mimeType) && selected.previewUrl ? (
              <div data-testid="po-doc-preview" className="rounded border border-zinc-200 overflow-hidden min-h-[280px]">
                {selected.mimeType.startsWith("image/") ? (
                  <img src={selected.previewUrl} alt={selected.fileName} className="max-w-full mx-auto" />
                ) : (
                  <iframe title={selected.fileName} src={selected.previewUrl} className="w-full h-[360px]" />
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500" data-testid="po-doc-preview-unavailable">
                Inline preview is not available for this file type. Use download instead.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.canDownload && selected.downloadUrl ? (
                <a
                  href={selected.downloadUrl}
                  className="dmx-btn-secondary text-sm"
                  data-testid="po-doc-download"
                >
                  Download
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      {uploadOpen ? (
        <UploadDialog
          progress={uploadPct}
          busy={uploadMut.isPending}
          onClose={() => setUploadOpen(false)}
          onSubmit={(file, category, title) => uploadMut.mutate({ file, category, title })}
        />
      ) : null}

      {replaceTarget ? (
        <ConfirmFileDialog
          title={`Replace ${replaceTarget.fileName}?`}
          confirmLabel="Replace file"
          testId="po-doc-replace-dialog"
          progress={uploadPct}
          busy={replaceMut.isPending}
          onClose={() => setReplaceTarget(null)}
          onFile={(file) => replaceMut.mutate({ doc: replaceTarget, file })}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 bg-ink-950/30 flex items-center justify-center p-4"
          data-testid="po-doc-delete-dialog"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-modal p-5 max-w-md w-full space-y-3">
            <h3 className="font-semibold">Delete document?</h3>
            <p className="text-sm text-zinc-600">
              This will remove <span className="font-medium">{deleteTarget.fileName}</span> from the Commercial Document Center.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                type="button"
                className="dmx-btn-primary text-sm bg-rose-700"
                data-testid="po-doc-delete-confirm"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DocActions({
  doc,
  onOpen,
  onReplace,
  onDelete,
}: {
  doc: CommercialDocumentDto;
  onOpen: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button type="button" className="text-blue-700 hover:underline" onClick={onOpen} data-testid={`po-doc-preview-btn-${doc.id}`}>
        Preview
      </button>
      {doc.canDownload && doc.downloadUrl ? (
        <a href={doc.downloadUrl} className="text-blue-700 hover:underline" data-testid={`po-doc-download-btn-${doc.id}`}>
          Download
        </a>
      ) : null}
      {doc.canReplace ? (
        <button type="button" className="text-blue-700 hover:underline" onClick={onReplace} data-testid={`po-doc-replace-btn-${doc.id}`}>
          Replace
        </button>
      ) : null}
      {doc.canDelete ? (
        <button type="button" className="text-rose-700 hover:underline" onClick={onDelete} data-testid={`po-doc-delete-btn-${doc.id}`}>
          Delete
        </button>
      ) : null}
    </div>
  );
}

function UploadDialog({
  onClose,
  onSubmit,
  busy,
  progress,
}: {
  onClose: () => void;
  onSubmit: (file: File, category: string, title?: string) => void;
  busy: boolean;
  progress: number | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("COMMERCIAL_INVOICE");
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" data-testid="po-doc-upload-dialog">
      <div className="bg-white rounded-xl shadow-modal p-5 max-w-md w-full space-y-3">
        <h3 className="font-semibold">Upload Document</h3>
        <label className="block text-xs text-zinc-600 space-y-1">
          <span>Category</span>
          <select className="w-full rounded border px-2 py-1.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="po-doc-upload-category">
            {COMMERCIAL_DOCUMENT_CATEGORIES.filter((c) => c !== "PURCHASE_ORDER").map((c) => (
              <option key={c} value={c}>{commercialCategoryLabel(c)}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-zinc-600 space-y-1">
          <span>Title (optional)</span>
          <input className="w-full rounded border px-2 py-1.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-xs text-zinc-600 space-y-1">
          <span>File</span>
          <input
            type="file"
            data-testid="po-doc-upload-file"
            className="w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {progress != null ? (
          <p className="text-xs text-zinc-600" data-testid="po-doc-upload-progress" aria-live="polite">
            Uploading… {progress}%
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="dmx-btn-secondary text-sm" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="dmx-btn-primary text-sm"
            data-testid="po-doc-upload-submit"
            disabled={!file || busy}
            onClick={() => file && onSubmit(file, category, title || undefined)}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmFileDialog({
  title,
  confirmLabel,
  testId,
  onClose,
  onFile,
  busy,
  progress,
}: {
  title: string;
  confirmLabel: string;
  testId: string;
  onClose: () => void;
  onFile: (file: File) => void;
  busy: boolean;
  progress: number | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" data-testid={testId}>
      <div className="bg-white rounded-xl shadow-modal p-5 max-w-md w-full space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <input type="file" data-testid={`${testId}-file`} className="w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {progress != null ? <p className="text-xs text-zinc-600" aria-live="polite">Uploading… {progress}%</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="dmx-btn-secondary text-sm" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="dmx-btn-primary text-sm"
            data-testid={`${testId}-confirm`}
            disabled={!file || busy}
            onClick={() => file && onFile(file)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommercialDocumentCenter;
