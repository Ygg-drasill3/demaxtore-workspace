import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { downloadAuthenticatedDocument } from "@/lib/authenticated-file";
import { documentCenterApi } from "../lib/document-center.api";

export default function DocumentDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const { t } = useT();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["document-detail", id],
    queryFn: () => documentCenterApi.detail(id),
    enabled: !!id,
  });

  const mutate = useMutation({
    mutationFn: (action: "approve" | "reject" | "revision") => {
      if (action === "approve") return documentCenterApi.approve(id, comment || undefined);
      if (action === "reject") return documentCenterApi.reject(id, comment);
      return documentCenterApi.requestRevision(id, comment);
    },
    onSuccess: () => {
      toast.success("Document updated");
      void qc.invalidateQueries({ queryKey: ["document-detail", id] });
      void qc.invalidateQueries({ queryKey: ["document-center"] });
    },
    onError: () => toast.error("Action failed"),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return <div data-testid="document-detail-error" className="p-8 text-center text-red-600">Document not found.</div>;
  }

  const canReview = user?.role === "ADMIN" || user?.role === "BUYER";
  const hasFile = Boolean(data.downloadUrl);

  return (
    <div data-testid="document-detail" data-guide="document-detail" className="max-w-5xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/documents" className="text-xs text-zinc-500 hover:underline">← Document Center</Link>
          <h1 className="font-display text-2xl font-semibold mt-2">{data.documentName}</h1>
          <p className="text-sm text-zinc-500 mt-1">{data.category} · v{data.version} · {data.status} · {data.source}</p>
        </div>
        {hasFile && (
          <button
            type="button"
            data-testid="document-download"
            className="dmx-btn-secondary text-sm inline-flex items-center gap-1.5"
            onClick={() => void downloadAuthenticatedDocument(data.downloadUrl!, data.documentName)}
          >
            <Download className="h-4 w-4" /> {t("documents.download")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 dmx-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">{t("documents.preview")}</h2>
          {hasFile ? (
            <DocumentPreview
              url={data.downloadUrl!}
              fileName={data.documentName}
            />
          ) : (
            <div data-testid="document-preview" className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-500">
              No file uploaded yet
            </div>
          )}
          {data.reviewComment && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Review note: {data.reviewComment}
            </div>
          )}
        </section>

        <section className="dmx-card p-5 space-y-3 text-sm">
          <h2 className="text-sm font-semibold">Metadata</h2>
          <div><span className="text-zinc-500">Source</span><div>{data.source}</div></div>
          {data.poNumber && (
            <div>
              <span className="text-zinc-500">{t("documents.dc.colPo", "PO No.")}</span>
              <div className="font-mono text-xs">
                {data.orderWorkspaceUrl ? (
                  <Link to={data.orderWorkspaceUrl} className="text-accent-900 hover:underline">{data.poNumber}</Link>
                ) : (
                  data.poNumber
                )}
              </div>
            </div>
          )}
          <div><span className="text-zinc-500">Trade / RFQ</span><div className="font-mono text-xs">{data.tradeId ?? data.relatedEntityRef ?? "—"}</div></div>
          <div><span className="text-zinc-500">Entity</span><div>{data.relatedEntityType} · {data.relatedEntityRef}</div></div>
          <div><span className="text-zinc-500">Uploaded</span><div>{data.uploadedAt ? new Date(data.uploadedAt).toLocaleString() : "—"}</div></div>
          {data.tradeWorkspaceUrl && (
            <Link to={data.tradeWorkspaceUrl} className="text-accent-900 hover:underline text-xs">Open trade workspace</Link>
          )}
          {data.source === "RFQ" && data.relatedEntityId && (
            <Link to={`/workspace/rfq/${data.relatedEntityId}`} className="text-accent-900 hover:underline text-xs block">
              Open RFQ workspace
            </Link>
          )}
        </section>
      </div>

      {data.versions.length > 0 && (
        <section data-testid="document-versions" className="dmx-card p-5">
          <h2 className="text-sm font-semibold mb-3">Version history</h2>
          <ul className="space-y-2 text-sm">
            {data.versions.map((v) => (
              <li key={v.id} data-testid={`doc-version-${v.version}`} className="flex justify-between border-b border-zinc-100 pb-2">
                <span>v{v.version} — {v.fileName}{v.isLatest ? " (active)" : ""}</span>
                <span className="text-xs text-zinc-500">{new Date(v.uploadedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.timeline.length > 0 && (
        <section data-testid="document-timeline" className="dmx-card p-5">
          <h2 className="text-sm font-semibold mb-3">Timeline</h2>
          <ol className="space-y-2 text-sm">
            {data.timeline.map((e) => (
              <li key={e.id}>{e.label} · {new Date(e.createdAt).toLocaleString()}</li>
            ))}
          </ol>
        </section>
      )}

      {canReview && data.source === "TRADE" && ["Uploaded", "Under Review"].includes(data.status) && (
        <section data-testid="document-review-actions" className="dmx-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Review actions</h2>
          <textarea
            data-testid="document-review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (required for reject / revision)"
            className="w-full rounded-lg border border-zinc-200 p-3 text-sm min-h-[80px]"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="document-approve" className="dmx-btn-primary text-sm" onClick={() => mutate.mutate("approve")}>Approve</button>
            <button type="button" data-testid="document-reject" className="dmx-btn-secondary text-sm" disabled={!comment.trim()} onClick={() => mutate.mutate("reject")}>Reject</button>
            <button type="button" data-testid="document-request-revision" className="dmx-btn-secondary text-sm" disabled={!comment.trim()} onClick={() => mutate.mutate("revision")}>Request revision</button>
          </div>
        </section>
      )}
    </div>
  );
}
