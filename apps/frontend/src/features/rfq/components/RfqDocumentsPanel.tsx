// apps/frontend/src/features/rfq/components/RfqDocumentsPanel.tsx
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rfqApi, rfqAttachmentUrl } from "../lib/rfq.api";
import { api } from "@/lib/api";
import { downloadAuthenticatedDocument } from "@/lib/authenticated-file";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader, CardTitle, CardEyebrow, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { useT } from "@/i18n/useT";
import { FileText, Download, UploadCloud, Plus, Eye, Search } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
  sizeBytes?: number;
  uploadedAt: string;
  uploadedBy?: string;
  uploaderName?: string | null;
  version?: number;
  url?: string;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function normalizeAttachment(workspaceId: string, f: Attachment) {
  const size = f.sizeBytes ?? f.fileSizeBytes ?? 0;
  return {
    ...f,
    sizeBytes: size,
    url: f.url ?? rfqAttachmentUrl(workspaceId, f.id),
  };
}

function DocumentRow({
  f,
  onPreview,
  onDownload,
}: {
  f: ReturnType<typeof normalizeAttachment>;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const { t } = useT();
  return (
    <li data-testid={`rfq-document-${f.id}`} className="px-1 py-2.5 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-paper-100 grid place-items-center text-zinc-600 shrink-0">
        <FileText className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-900 truncate">
          {f.fileName}
          {f.version && f.version > 1 && (
            <span className="ml-1.5 text-[10px] text-zinc-400">v{f.version}</span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500">
          {fmtSize(f.sizeBytes)} · {f.uploaderName ?? "—"} · {formatRelative(f.uploadedAt)}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onPreview}
          className="h-8 w-8 rounded-md grid place-items-center text-zinc-500 hover:bg-paper-100 hover:text-ink-900"
          aria-label={`${t("documents.preview")} ${f.fileName}`}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="h-8 w-8 rounded-md grid place-items-center text-zinc-500 hover:bg-paper-100 hover:text-ink-900"
          aria-label={`${t("documents.download")} ${f.fileName}`}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function RfqDocumentsPanel({ workspaceId }: { workspaceId: string }) {
  const { t } = useT();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<ReturnType<typeof normalizeAttachment> | null>(null);
  const { track } = useTelemetry();

  const { data, isLoading } = useQuery({
    queryKey: ["rfq", workspaceId, "attachments"],
    queryFn: () => rfqApi.attach(workspaceId) as Promise<Attachment[]>,
  });

  const files = useMemo(
    () =>
      (data ?? [])
        .map((f) => normalizeAttachment(workspaceId, f))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [data, workspaceId],
  );

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [files, search]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data: uploaded } = await api.post(`/rfq/${workspaceId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return uploaded;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "attachments"] }),
  });

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    for (const f of Array.from(fileList)) upload.mutate(f);
  };

  const handleDownload = (f: ReturnType<typeof normalizeAttachment>) => {
    track("document.downloaded", { workspaceId, targetId: f.id });
    void downloadAuthenticatedDocument(f.url, f.fileName);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>{t("documents.panel.eyebrow")}</CardEyebrow>
            <CardTitle className="mt-1">{t("documents.panel.title")}</CardTitle>
          </div>
          <Button data-testid="documents-upload-trigger" variant="ghost" size="sm"
                  onClick={() => inputRef.current?.click()}>
            <Plus className="h-3.5 w-3.5" /> {t("documents.panel.upload")}
          </Button>
        </CardHeader>
        <CardBody>
          <input ref={inputRef} type="file" multiple className="hidden"
                 accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                 onChange={(e) => handleFiles(e.target.files)} />

          <div
            data-testid="documents-dropzone"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={cn(
              "rounded-lg border border-dashed py-4 text-center text-xs transition-colors mb-3 cursor-pointer",
              dragOver ? "bg-accent-50 border-accent-900/30 text-accent-900"
                       : "border-paper-200 text-zinc-500 hover:bg-paper-50",
            )}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-4 w-4 mx-auto mb-1" />
            {t("documents.panel.dropHint")}
            <div className="text-[10px] text-zinc-400 mt-0.5">{t("documents.panel.formats")}</div>
          </div>

          {upload.isPending && <div className="text-xs text-zinc-500 mb-2">{t("documents.panel.uploading")}</div>}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : files.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title={t("documents.panel.empty.title")}
                        body={t("documents.panel.empty.body")} />
          ) : (
            <ul data-testid="rfq-documents-list" className="divide-y divide-paper-200 -mx-1">
              {files.slice(0, 6).map((f) => (
                <DocumentRow
                  key={f.id}
                  f={f}
                  onPreview={() => setPreviewFile(f)}
                  onDownload={() => handleDownload(f)}
                />
              ))}
            </ul>
          )}
          {files.length > 6 && (
            <button
              type="button"
              className="text-xs text-accent-900 font-medium hover:underline mt-2"
              onClick={() => setShowAll(true)}
            >
              ▸ {t("documents.panel.all", undefined, { count: files.length })}
            </button>
          )}
        </CardBody>
      </Card>

      <Modal
        open={showAll}
        onClose={() => { setShowAll(false); setSearch(""); }}
        title={t("documents.panel.title")}
        description={t("documents.panel.filterRfq")}
        size="lg"
        testId="rfq-documents-all-modal"
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("documents.panel.search")}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        {filteredFiles.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">{t("documents.panel.empty.title")}</p>
        ) : (
          <ul className="divide-y divide-paper-200 max-h-[50vh] overflow-y-auto -mx-1">
            {filteredFiles.map((f) => (
              <DocumentRow
                key={f.id}
                f={f}
                onPreview={() => { setShowAll(false); setPreviewFile(f); }}
                onDownload={() => handleDownload(f)}
              />
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.fileName}
        size="xl"
        testId="rfq-document-preview-modal"
        footer={
          previewFile && (
            <Button size="sm" variant="secondary" onClick={() => handleDownload(previewFile)}>
              <Download className="h-3.5 w-3.5" /> {t("documents.download")}
            </Button>
          )
        }
      >
        {previewFile && (
          <DocumentPreview
            url={previewFile.url}
            fileName={previewFile.fileName}
            mimeType={previewFile.mimeType}
          />
        )}
      </Modal>
    </>
  );
}
