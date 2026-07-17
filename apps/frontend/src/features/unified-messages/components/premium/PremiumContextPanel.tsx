import type { UnifiedConversationSummary } from "@dmx/contracts/unified-messaging";
import { Archive, File, Phone, Users, X } from "lucide-react";
import { useState } from "react";
import { unifiedMessagesApi } from "../../lib/unified-messages.api";
import { usePhoneVerificationMe } from "@/features/phone-verification/hooks/usePhoneVerification";

export function PremiumContextPanel({
  detail,
  conversationId,
  onClose,
  mobile,
}: {
  detail?: UnifiedConversationSummary;
  conversationId: string;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const [assignId, setAssignId] = useState(detail?.assignedUserId ?? "");
  const phoneMe = usePhoneVerificationMe();

  return (
    <aside
      className={
        mobile
          ? "fixed inset-0 z-50 bg-white flex flex-col"
          : "w-[300px] lg:w-[320px] border-l border-zinc-200/80 bg-white shrink-0 overflow-y-auto"
      }
      data-testid={mobile ? "unified-messages-context-drawer" : "context-panel"}
    >
      {mobile && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Context</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
      )}
      <div className="p-5 space-y-6">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Company</h3>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {detail?.subject ?? detail?.contexts[0]?.contextReference ?? "—"}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> Phone verification
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            {phoneMe.data?.phoneNumber ?? "Not set"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Status: {phoneMe.data?.phoneVerificationStatus ?? "—"}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Participants
          </h3>
          <ul className="mt-2 space-y-1.5">
            {(detail?.participants ?? []).map((p) => (
              <li key={p.id} className="text-sm text-zinc-700">
                {p.displayName ?? p.participantKey}
              </li>
            ))}
          </ul>
        </section>

        {detail?.contexts.map((c) => (
          <section key={c.id}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{c.contextType}</h3>
            <p className="mt-1 text-sm text-zinc-600 truncate">{c.contextId}</p>
          </section>
        ))}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Assignment</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
              data-testid="assign-user-input"
            />
            <button
              type="button"
              className="text-xs px-2 py-1.5 rounded-lg bg-zinc-900 text-white"
              onClick={() => void unifiedMessagesApi.assign(conversationId, assignId.trim())}
            >
              Assign
            </button>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="archive-conversation"
            className="text-xs flex items-center gap-1 px-2 py-1 border rounded-lg"
            onClick={() => void unifiedMessagesApi.archive(conversationId)}
          >
            <Archive className="h-3.5 w-3.5" /> Archive
          </button>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <File className="h-3.5 w-3.5" /> Recent files
          </h3>
          <p className="mt-2 text-xs text-zinc-500">Attachments appear in the timeline</p>
        </section>
      </div>
    </aside>
  );
}
