// apps/frontend/src/features/rfq/components/RfqParticipants.tsx
import { useRfqWorkspace } from "../hooks";
import { Users } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  OWNER:        "bg-blue-900 text-white",
  COUNTERPARTY: "bg-emerald-100 text-emerald-800",
  OPERATOR:     "bg-zinc-900 text-white",
  OBSERVER:     "bg-zinc-100 text-zinc-700",
};

export function RfqParticipants({ workspaceId }: { workspaceId: string }) {
  const { data: rfq } = useRfqWorkspace(workspaceId);
  const participants = (rfq as any)?.participants ?? [];

  return (
    <div data-testid="rfq-participants" className="dmx-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-500" />
          <h3 className="font-display text-base font-semibold tracking-tight">Participants</h3>
        </div>
        <span className="text-xs text-zinc-500">{participants.length}</span>
      </div>
      {participants.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4 text-center">No participants yet.</div>
      ) : (
        <ul className="space-y-2">
          {participants.map((p: any) => (
            <li key={p.userId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-zinc-100 text-zinc-700 grid place-items-center text-xs font-semibold shrink-0">
                  {(p.name ?? p.userId).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-zinc-900 truncate">{p.name ?? p.email ?? p.userId}</div>
                  <div className="text-[11px] text-zinc-500">{p.email}</div>
                </div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${ROLE_COLORS[p.participantRole] ?? "bg-zinc-100"}`}>
                {p.participantRole}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
