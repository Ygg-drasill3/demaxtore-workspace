import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChevronRight } from "lucide-react";
import { computeCommodityBidNextActions } from "@dmx/contracts/commoditybid.next-actions";
import { commoditybidScriptFor } from "@dmx/contracts/commoditybid.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import type { CommodityBidState } from "@dmx/contracts/commoditybid.fsm";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";

interface Props {
  state: CommodityBidState;
  actorRole: ActorRole;
  isOwner: boolean;
  isCounterparty: boolean;
  onRunAction: (action: string) => void;
}

export function CommodityBidActionDrawer({ state, actorRole, isOwner, isCounterparty, onRunAction }: Props) {
  const [open, setOpen] = useState(false);
  const allowed = computeCommodityBidNextActions({
    state, actorRole, isOwner, isCounterparty, hasActiveBidOnAnyLot: false,
  });
  const primary = commoditybidScriptFor(state, toWorkspaceScriptRole(actorRole) ?? "BUYER")?.primaryAction;
  const other = allowed.filter((a) => a.action !== primary);
  if (!other.length) return null;

  return (
    <>
      <div className="flex justify-end">
        <button type="button" data-testid="cb-more-actions" className="text-sm font-medium text-accent-900 hover:underline" onClick={() => setOpen(true)}>
          More actions ({other.length})
        </button>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="More actions" testId="cb-action-drawer">
        <ul className="space-y-1 p-4">
          {other.map((a) => (
            <li key={a.action}>
              <button
                type="button"
                data-testid={`cb-drawer-action-${a.action}`}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-paper-50 text-left"
                onClick={() => { onRunAction(a.action); setOpen(false); }}
              >
                <span>{a.label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </button>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}
