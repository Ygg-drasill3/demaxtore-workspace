import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentCenterApi } from "../lib/document-center.api";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

export default function TradeDocumentsPanelPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["trade-documents-panel", id],
    queryFn: () => documentCenterApi.tradeDocuments(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return <div data-testid="trade-documents-panel-error" className="p-8 text-center text-red-600">Could not load trade documents.</div>;
  }

  return (
    <div data-testid="trade-documents-panel" data-guide="trade-documents-panel" className="max-w-5xl mx-auto space-y-6 pb-10 animate-fade-in">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link to={`/workspace/trade/${id}`} className="text-xs text-zinc-500 hover:underline">← Trade workspace</Link>
          <h1 className="font-display text-2xl font-semibold mt-1">Documents — {data.tradeId}</h1>
        </div>
        <Link to="/documents" className="text-sm text-accent-900 hover:underline">Open Document Center</Link>
      </header>

      <section data-testid="trade-doc-checklist" className="dmx-card p-5">
        <h2 className="text-sm font-semibold mb-3">Required document checklist</h2>
        <ul className="space-y-2 text-sm">
          {data.checklist.map((c) => (
            <li key={c.documentType} data-testid={`checklist-${c.documentType}`} className="flex justify-between gap-2 border-b border-zinc-100 pb-2">
              <span>{c.category}{c.required ? " *" : ""}</span>
              <span className="text-zinc-600">{c.status}</span>
              {c.documentId && (
                <Link to={`/documents/${encodeURIComponent(c.documentId)}`} className="text-xs text-accent-900">Open</Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Missing", items: data.missing, testId: "trade-docs-missing" },
          { title: "Pending review", items: data.pendingReview, testId: "trade-docs-pending" },
          { title: "Rejected", items: data.rejected, testId: "trade-docs-rejected" },
          { title: "Approved", items: data.approved, testId: "trade-docs-approved" },
        ].map(({ title, items, testId }) => (
          <section key={testId} data-testid={testId} className="dmx-card p-4">
            <h3 className="text-sm font-semibold mb-2">{title} ({items.length})</h3>
            {items.length === 0 ? (
              <p className="text-xs text-zinc-500">None</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {items.map((d) => (
                  <li key={d.id}>
                    <Link to={`/documents/${encodeURIComponent(d.id)}`} className="text-accent-900 hover:underline">{d.documentName}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
