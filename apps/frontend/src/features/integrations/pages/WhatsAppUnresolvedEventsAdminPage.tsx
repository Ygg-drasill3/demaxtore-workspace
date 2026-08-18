import { useState } from "react";
import { AlertTriangle, Eye, Link2, RefreshCw, XCircle } from "lucide-react";
import {
  useIgnoreUnresolvedEvent,
  useReprocessUnresolvedEvent,
  useResolveUnresolvedEvent,
  useUnresolvedEventAudit,
  useUnresolvedWebhookEvents,
} from "../lib/whatsapp-unresolved-admin.api";

export default function WhatsAppUnresolvedEventsAdminPage() {
  const eventsQuery = useUnresolvedWebhookEvents();
  const resolveEvent = useResolveUnresolvedEvent();
  const reprocessEvent = useReprocessUnresolvedEvent();
  const ignoreEvent = useIgnoreUnresolvedEvent();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkConversationId, setLinkConversationId] = useState("");
  const auditQuery = useUnresolvedEventAudit(selectedId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Unresolved WhatsApp Events</h1>
          <p className="text-sm text-zinc-500">Inbound webhooks that could not be routed to a buyer conversation.</p>
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (eventsQuery.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          No unresolved events.
        </div>
      ) : (
        <div className="space-y-4">
          {eventsQuery.data?.map((event) => (
            <article key={event.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {event.buyerDisplayName ?? event.buyerEmail ?? "Unknown buyer"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {event.receivedAt} · {event.reason}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {event.connectionStatus ?? "no connection"}
                </span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-zinc-500">Phone number ID</dt><dd>{event.phoneNumberIdMasked ?? "—"}</dd></div>
                <div><dt className="text-zinc-500">Supplier phone</dt><dd>{event.supplierPhoneMasked ?? "—"}</dd></div>
                <div><dt className="text-zinc-500">Message type</dt><dd>{event.messageType ?? "—"}</dd></div>
                <div><dt className="text-zinc-500">Meta message ID</dt><dd>{event.metaMessageIdMasked ?? "—"}</dd></div>
              </dl>

              {event.candidateConversationIds.length > 0 && (
                <p className="mt-3 text-xs text-zinc-600">
                  Candidates: {event.candidateConversationIds.join(", ")}
                </p>
              )}

              <details className="mt-3 text-xs text-zinc-600">
                <summary className="cursor-pointer">Payload summary</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2">{JSON.stringify(event.payloadSummary, null, 2)}</pre>
              </details>

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Workspace conversation UUID"
                  value={selectedId === event.id ? linkConversationId : ""}
                  onFocus={() => setSelectedId(event.id)}
                  onChange={(e) => setLinkConversationId(e.target.value)}
                  className="min-w-[240px] rounded border border-zinc-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!linkConversationId || resolveEvent.isPending}
                  onClick={() => resolveEvent.mutate({ eventId: event.id, workspaceConversationId: linkConversationId })}
                  className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <Link2 className="h-4 w-4" /> Link conversation
                </button>
                <button
                  type="button"
                  onClick={() => reprocessEvent.mutate(event.id)}
                  className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <RefreshCw className="h-4 w-4" /> Reprocess
                </button>
                <button
                  type="button"
                  onClick={() => ignoreEvent.mutate(event.id)}
                  className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <XCircle className="h-4 w-4" /> Ignore
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <Eye className="h-4 w-4" /> Audit log
                </button>
              </div>

              {selectedId === event.id && auditQuery.data && (
                <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-zinc-600">
                  {auditQuery.data.map((a) => (
                    <li key={a.id}>{a.createdAt} — {a.action}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
