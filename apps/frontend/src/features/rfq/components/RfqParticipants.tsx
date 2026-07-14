// apps/frontend/src/features/rfq/components/RfqParticipants.tsx
import { useRfqWorkspace } from "../hooks";
import { Users } from "lucide-react";
import { useT } from "@/i18n/useT";
import type { RfqParticipantDTO } from "@dmx/contracts/rfq-participants";
import { areRfqParticipantIdentitiesRevealed } from "@dmx/contracts/rfq-participants";

const ROLE_COLORS: Record<string, string> = {
  OWNER:        "bg-blue-900 text-white",
  COUNTERPARTY: "bg-emerald-100 text-emerald-800",
  OPERATOR:     "bg-zinc-900 text-white",
  OBSERVER:     "bg-zinc-100 text-zinc-700",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function RfqParticipants({ workspaceId }: { workspaceId: string }) {
  const { t } = useT();
  const { data: rfq } = useRfqWorkspace(workspaceId);
  const participants = ((rfq as { participants?: RfqParticipantDTO[] } | undefined)?.participants) ?? [];
  const state = (rfq as { state?: string } | undefined)?.state ?? "";
  const identitiesRevealed = areRfqParticipantIdentitiesRevealed(state);
  const hasMaskedCounterparty = participants.some(
    (p) => p.participantRole === "COUNTERPARTY" && !p.identityRevealed,
  );

  return (
    <div data-testid="rfq-participants" className="dmx-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-500" />
          <h3 className="font-display text-base font-semibold tracking-tight">
            {t("rfq.participants.title", "Participants")}
          </h3>
        </div>
        <span className="text-xs text-zinc-500">{participants.length}</span>
      </div>

      {!identitiesRevealed && hasMaskedCounterparty && (
        <p
          data-testid="rfq-participants-masked-hint"
          className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3"
        >
          {t(
            "rfq.participants.maskedHint",
            "Supplier names appear after DeMaxtore publishes this RFQ.",
          )}
        </p>
      )}

      {participants.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4 text-center">
          {t("rfq.participants.empty", "No participants yet.")}
        </div>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li
              key={p.userId}
              data-testid={`rfq-participant-${p.participantRole.toLowerCase()}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-zinc-100 text-zinc-700 grid place-items-center text-xs font-semibold shrink-0">
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <div
                    data-testid={`rfq-participant-name-${p.userId}`}
                    className="text-sm text-zinc-900 truncate"
                  >
                    {p.name}
                  </div>
                  {p.identityRevealed && p.email && (
                    <div className="text-[11px] text-zinc-500 truncate">{p.email}</div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${ROLE_COLORS[p.participantRole] ?? "bg-zinc-100"}`}>
                {p.participantRole}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
