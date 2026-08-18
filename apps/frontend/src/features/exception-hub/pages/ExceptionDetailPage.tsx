import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { toast } from "@/store/toast.store";
import { cn } from "@/lib/utils";
import type { ExceptionSeverity } from "@dmx/contracts/exception-hub";
import { exceptionHubApi } from "../lib/exception-hub.api";

const SEVERITY_STYLES: Record<ExceptionSeverity, string> = {
  Critical: "bg-red-100 text-red-900 border-red-200",
  High: "bg-orange-100 text-orange-900 border-orange-200",
  Medium: "bg-amber-100 text-amber-900 border-amber-200",
  Low: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export default function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [resolutionNote, setResolutionNote] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["exception-detail", id],
    queryFn: () => exceptionHubApi.detail(id!),
    enabled: !!id,
  });

  const resolveMut = useMutation({
    mutationFn: () => exceptionHubApi.resolve(id!, resolutionNote),
    onSuccess: () => {
      toast.success("Exception resolved");
      void qc.invalidateQueries({ queryKey: ["exception-detail", id] });
      void qc.invalidateQueries({ queryKey: ["exception-hub"] });
    },
    onError: () => toast.error("Could not resolve exception"),
  });

  const closeMut = useMutation({
    mutationFn: () => exceptionHubApi.close(id!, resolutionNote || undefined),
    onSuccess: () => {
      toast.success("Exception closed");
      void qc.invalidateQueries({ queryKey: ["exception-detail", id] });
      void qc.invalidateQueries({ queryKey: ["exception-hub"] });
    },
    onError: () => toast.error("Could not close exception"),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div data-testid="exception-detail-error" className="p-8 text-center text-red-600">
        Exception not found.
        <button type="button" className="dmx-btn-secondary mt-3 block mx-auto" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const isOpen = !["Resolved", "Closed"].includes(data.status);
  const canResolve = isOpen && (user?.role === "ADMIN" || !data.ownerId || data.ownerId === user?.id);

  return (
    <div data-testid="exception-detail" data-guide="alert-detail" className="max-w-6xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div>
        <Link to="/alerts" className="text-xs text-zinc-500 hover:underline">← Alerts</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h1 className="font-display text-2xl font-semibold">{data.exceptionRef}</h1>
              <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", SEVERITY_STYLES[data.severity])}>
                {data.severity}
              </span>
            </div>
            <p className="text-sm text-zinc-600 mt-1">{data.title}</p>
          </div>
          <span className="text-sm text-zinc-500">{data.status}</span>
        </div>
      </div>

      {data.requiredAction && isOpen && (
        <section data-testid="exception-required-action" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-[10px] uppercase tracking-wider text-amber-800">Required Action</div>
          <div className="text-sm font-medium text-amber-950 mt-1">{data.requiredAction}</div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section data-testid="exception-summary" className="lg:col-span-2 dmx-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Exception Summary</h2>
          <p className="text-sm text-zinc-600">{data.description || "No additional details."}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-zinc-500">Type</dt><dd className="font-medium">{data.exceptionType}</dd></div>
            <div><dt className="text-zinc-500">Created</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
            <div><dt className="text-zinc-500">Due date</dt><dd>{data.dueDate ? new Date(data.dueDate).toLocaleString() : "—"}</dd></div>
            <div><dt className="text-zinc-500">Resolution ETA</dt><dd>{data.resolutionEta ? new Date(data.resolutionEta).toLocaleString() : "—"}</dd></div>
            <div><dt className="text-zinc-500">Owner</dt><dd>{data.ownerName ?? data.ownerRole ?? "Unassigned"}</dd></div>
            <div><dt className="text-zinc-500">Workspace</dt><dd className="font-mono text-xs">{data.workspaceRef}</dd></div>
          </dl>
          {data.resolutionNote && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
              Resolution: {data.resolutionNote}
            </div>
          )}
        </section>

        <section data-testid="exception-trade-info" className="dmx-card p-5 space-y-3 text-sm">
          <h2 className="text-sm font-semibold">Trade Information</h2>
          <div><span className="text-zinc-500">Trade ID</span><div className="font-mono text-xs">{data.tradeId}</div></div>
          <div><span className="text-zinc-500">Buyer</span><div>{data.buyerName ?? "—"}</div></div>
          <div><span className="text-zinc-500">Manufacturer</span><div>{data.supplierName ?? "—"}</div></div>
          {data.shipmentRef && <div><span className="text-zinc-500">Shipment</span><div className="font-mono text-xs">{data.shipmentRef}</div></div>}
          <Link
            to={data.tradeWorkspaceUrl}
            data-testid="exception-trade-workspace-link"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent-900 hover:underline"
          >
            Open Trade Workspace <ExternalLink className="h-3 w-3" />
          </Link>
        </section>
      </div>

      {data.relatedDocuments.length > 0 && (
        <section data-testid="exception-documents" className="dmx-card p-5">
          <h2 className="text-sm font-semibold mb-3">Related Documents</h2>
          <ul className="space-y-2 text-sm">
            {data.relatedDocuments.map((d) => (
              <li key={d.id} className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <Link to={d.url} className="hover:underline">{d.name}</Link>
                <span className="text-xs text-zinc-500">{d.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.timeline.length > 0 && (
        <section data-testid="exception-timeline" className="dmx-card p-5">
          <h2 className="text-sm font-semibold mb-3">Timeline</h2>
          <ol className="space-y-2 text-sm">
            {data.timeline.map((e) => (
              <li key={e.id} data-testid={`exception-timeline-${e.id}`}>
                {e.label} · {new Date(e.createdAt).toLocaleString()}
                {e.actorName ? ` · ${e.actorName}` : ""}
              </li>
            ))}
          </ol>
        </section>
      )}

      {canResolve && (
        <section data-testid="exception-resolve-actions" className="dmx-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Resolution</h2>
          <textarea
            data-testid="exception-resolution-note"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Resolution note (required to resolve)"
            className="w-full rounded-lg border border-zinc-200 p-3 text-sm min-h-[80px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="exception-resolve-btn"
              className="dmx-btn-primary text-sm"
              disabled={!resolutionNote.trim() || resolveMut.isPending}
              onClick={() => resolveMut.mutate()}
            >
              Resolve
            </button>
            {(user?.role === "ADMIN" || user?.role === "BUYER") && (
              <button
                type="button"
                data-testid="exception-close-btn"
                className="dmx-btn-secondary text-sm"
                disabled={closeMut.isPending}
                onClick={() => closeMut.mutate()}
              >
                Close
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
