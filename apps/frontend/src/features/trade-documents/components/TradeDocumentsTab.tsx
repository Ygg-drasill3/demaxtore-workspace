import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentStatus, TradeDocumentType } from "@dmx/contracts/trade-documents";
import type { TradeWorkspaceType } from "@dmx/contracts/trade-documents";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { tradeDocumentsApi } from "../lib/trade-documents.api";

const DOC_LABELS: Record<TradeDocumentType, string> = {
  COMMERCIAL_INVOICE: "Commercial Invoice",
  PACKING_LIST: "Packing List",
  BILL_OF_LADING: "Bill of Lading",
  CERTIFICATE_OF_ORIGIN: "Certificate of Origin",
  HEALTH_CERTIFICATE: "Health Certificate",
  INSPECTION_REPORT: "Inspection Report",
  INSURANCE_CERTIFICATE: "Insurance Certificate",
  EXPORT_DECLARATION: "Export Declaration",
  OTHER: "Other",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  MISSING: "Missing",
  REQUESTED: "Requested",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

function docLabel(type: TradeDocumentType): string {
  return DOC_LABELS[type] ?? type.replace(/_/g, " ");
}

function statusLabel(status: DocumentStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function canUpload(status: DocumentStatus): boolean {
  return ["MISSING", "REQUESTED", "REJECTED", "EXPIRED"].includes(status);
}

type TabId = "required" | "uploaded" | "review" | "history";

interface Props {
  workspaceType: TradeWorkspaceType;
  workspaceId: string;
}

export default function TradeDocumentsTab({ workspaceType, workspaceId }: Props) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("required");
  const [uploadingType, setUploadingType] = useState<TradeDocumentType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadType = useRef<TradeDocumentType | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trade-documents", workspaceType, workspaceId],
    queryFn: () => tradeDocumentsApi.summary(workspaceType, workspaceId),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: Record<string, unknown> }) =>
      tradeDocumentsApi.action(workspaceType, workspaceId, action, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-documents", workspaceType, workspaceId] });
      toast.success("Document updated");
    },
    onError: () => toast.error("Action failed"),
  });

  const triggerUpload = (documentType: TradeDocumentType) => {
    pendingUploadType.current = documentType;
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const documentType = pendingUploadType.current;
    e.target.value = "";
    pendingUploadType.current = null;
    if (!file || !documentType) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File must be 25 MB or smaller");
      return;
    }

    setUploadingType(documentType);
    try {
      await tradeDocumentsApi.upload(workspaceType, workspaceId, documentType, file);
      toast.success(`${file.name} uploaded`);
      qc.invalidateQueries({ queryKey: ["trade-documents", workspaceType, workspaceId] });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingType(null);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="trade-docs-loading" className="text-sm text-zinc-500">
        Loading documents…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        data-testid="trade-docs-error"
        className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3"
      >
        <span>Could not load trade documents.</span>
        <button type="button" className="dmx-btn-secondary text-xs" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const canReview = isAdmin || user?.role === "BUYER";
  const canUploadDocs =
    isAdmin || user?.role === "SUPPLIER" || user?.role === "BUYER";

  const required = data.compliance.checklist.filter((c) => c.required);
  const uploaded = data.documents.filter((d) => d.status !== "MISSING");
  const reviewQueue = data.documents.filter((d) =>
    ["UPLOADED", "UNDER_REVIEW"].includes(d.status),
  );

  return (
    <div data-testid="trade-documents-tab" className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
        className="hidden"
        data-testid="trade-docs-file-input"
        onChange={(e) => void onFileSelected(e)}
      />

      <div
        data-testid="trade-docs-compliance"
        className={`text-xs p-3 rounded border ${
          data.compliance.status === "READY_FOR_SHIPMENT"
            ? "bg-green-50 border-green-200 text-green-900"
            : data.compliance.status === "PARTIALLY_READY"
              ? "bg-amber-50 border-amber-200"
              : "bg-zinc-50"
        }`}
      >
        <strong>Compliance:</strong> {data.compliance.status.replace(/_/g, " ")} ·{" "}
        {data.compliance.approvedCount}/{data.compliance.requiredCount} required approved
      </div>

      <nav className="flex flex-wrap gap-2 text-xs">
        {(
          [
            ["required", "Required"],
            ["uploaded", "Uploaded"],
            ["review", "Review"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`trade-docs-tab-${id}`}
            onClick={() => setTab(id)}
            className={`px-2 py-1 rounded ${tab === id ? "bg-blue-900 text-white" : "border"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "required" && (
        <section data-testid="trade-docs-required">
          {required.length === 0 ? (
            <p className="text-xs text-zinc-500">No required documents configured for this workspace.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {required.map((item) => (
                <li
                  key={item.documentType}
                  data-testid={`trade-docs-req-${item.documentType}`}
                  className="flex flex-wrap items-center justify-between gap-2 border border-paper-100 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{docLabel(item.documentType)}</div>
                    <div className="text-xs text-zinc-500">{statusLabel(item.status)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.documentId && item.status !== "MISSING" && (
                      <a
                        href={tradeDocumentsApi.downloadUrl(workspaceType, workspaceId, item.documentId)}
                        className="text-xs text-accent-900 hover:underline"
                        data-testid={`trade-docs-download-${item.documentType}`}
                      >
                        Download
                      </a>
                    )}
                    {canUploadDocs && canUpload(item.status) && (
                      <button
                        type="button"
                        data-testid={`trade-docs-upload-${item.documentType}`}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                        disabled={uploadingType === item.documentType}
                        onClick={() => triggerUpload(item.documentType)}
                      >
                        {uploadingType === item.documentType
                          ? "Uploading…"
                          : item.status === "REJECTED"
                            ? "Re-upload"
                            : "Upload"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "uploaded" && (
        <section data-testid="trade-docs-uploaded">
          {uploaded.length === 0 ? (
            <p className="text-xs text-zinc-500">No documents uploaded yet.</p>
          ) : (
            uploaded.map((doc) => (
              <div
                key={doc.id}
                data-testid={`trade-docs-doc-${doc.id}`}
                className="text-sm flex justify-between gap-2 border-t py-2"
              >
                <span>
                  {docLabel(doc.documentType)} · {statusLabel(doc.status)} · {doc.fileName ?? "—"}
                </span>
                {doc.fileId && (
                  <a
                    href={tradeDocumentsApi.downloadUrl(workspaceType, workspaceId, doc.id)}
                    className="text-xs text-accent-900 hover:underline shrink-0"
                  >
                    Download
                  </a>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {tab === "review" && (
        <section data-testid="trade-docs-review-queue">
          {reviewQueue.map((doc) => (
            <div key={doc.id} className="text-sm flex flex-wrap gap-2 items-center border-t py-2">
              <span>
                {docLabel(doc.documentType)} · {statusLabel(doc.status)}
              </span>
              {doc.fileId && (
                <a
                  href={tradeDocumentsApi.downloadUrl(workspaceType, workspaceId, doc.id)}
                  className="text-xs text-accent-900 hover:underline"
                >
                  Download
                </a>
              )}
              {canReview && doc.status === "UPLOADED" && (
                <>
                  <button
                    type="button"
                    data-testid={`trade-docs-approve-${doc.id}`}
                    className="px-2 py-0.5 text-xs border rounded text-green-800"
                    onClick={() =>
                      actionMutation.mutate({
                        action: "approve-document",
                        payload: { documentId: doc.id },
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    data-testid={`trade-docs-reject-${doc.id}`}
                    className="px-2 py-0.5 text-xs border rounded text-red-800"
                    onClick={() =>
                      actionMutation.mutate({
                        action: "reject-document",
                        payload: { documentId: doc.id, reason: "Incomplete or invalid document" },
                      })
                    }
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          ))}
          {!reviewQueue.length && <p className="text-xs text-zinc-500">Review queue empty</p>}
        </section>
      )}

      {tab === "history" && (
        <section data-testid="trade-docs-history" className="text-xs text-zinc-600 space-y-1">
          {data.reviews.length === 0 ? (
            <p className="text-zinc-500">No review history yet.</p>
          ) : (
            data.reviews.map((review) => (
              <div key={review.id}>
                {review.decision} · {review.reason ?? "—"}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
