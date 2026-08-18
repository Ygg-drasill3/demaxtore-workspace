import type { PurchaseOrderDocument } from "@dmx/contracts/purchase-order";
import { formatPoDate } from "../lib/purchase-order.formatters";

function mimeLabel(mime: string | null | undefined, fileName: string): string {
  if (mime?.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) return "PDF";
  if (mime) return mime;
  return "Document";
}

export function PurchaseOrderDocuments({
  documents,
}: {
  documents: PurchaseOrderDocument[];
}) {
  return (
    <section data-testid="po-documents" className="dmx-card p-4 space-y-3">
      <h2 className="font-medium">Documents</h2>
      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="po-documents-empty">
          No documents attached
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              data-testid={`po-document-${doc.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                <p className="text-xs text-zinc-500">
                  {mimeLabel(doc.mimeType, doc.fileName)}
                  {doc.uploadedAt ? ` · ${formatPoDate(doc.uploadedAt)}` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={doc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  data-testid={`po-document-open-${doc.id}`}
                >
                  Open
                </a>
                <a
                  href={doc.documentUrl}
                  download={doc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  data-testid={`po-document-download-${doc.id}`}
                >
                  Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
