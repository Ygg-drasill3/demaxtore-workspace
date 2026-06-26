import { Drawer } from "@/components/ui/Drawer";
import { ChevronRight } from "lucide-react";
import { computeShipmentNextActions, type ShipmentNextAction } from "@dmx/contracts/shipment.next-actions";
import { shipmentScriptFor } from "@dmx/contracts/shipment.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import type { ShipmentState, ShipmentAction, ActorRole } from "@dmx/contracts/shipment.fsm";

interface Props {
  open: boolean;
  onClose: () => void;
  state: ShipmentState;
  actorRole: ActorRole;
  isOwner: boolean;
  isCounterparty: boolean;
  hasOpenException?: boolean;
  onRunAction: (action: ShipmentAction) => void;
}

export function ShipmentActionDrawer(props: Props) {
  const { open, onClose, state, actorRole, isOwner, isCounterparty, hasOpenException, onRunAction } = props;
  const allowed = computeShipmentNextActions({ state, actorRole, isOwner, isCounterparty, hasOpenException });
  const primaryAction = shipmentScriptFor(state, toWorkspaceScriptRole(actorRole) ?? "BUYER")?.primaryAction;
  const otherActions = allowed.filter((a) => a.action !== primaryAction);

  const handle = (a: ShipmentNextAction) => { onRunAction(a.action); onClose(); };
  if (!otherActions.length) return null;

  return (
    <Drawer open={open} onClose={onClose} title="More actions" testId="shipment-action-drawer">
      <ul className="space-y-1 p-4">
        {otherActions.map((a) => (
          <li key={a.action}>
            <button
              type="button"
              data-testid={`shipment-drawer-action-${a.action}`}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-paper-50 text-left"
              onClick={() => handle(a)}
            >
              <span>{a.label}</span>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
