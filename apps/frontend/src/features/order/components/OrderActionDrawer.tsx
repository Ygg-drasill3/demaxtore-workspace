import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";
import { computeOrderNextActions, type NextAction } from "@dmx/contracts/order.next-actions";
import { orderScriptFor } from "@dmx/contracts/order.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import type { OrderState, OrderAction, ActorRole } from "@dmx/contracts/order.fsm";
import { useT } from "@/i18n/useT";

interface Props {
  open: boolean;
  onClose: () => void;
  state: OrderState;
  actorRole: ActorRole;
  isOwner: boolean;
  isCounterparty: boolean;
  inspectionResult?: string | null;
  productionPercent?: number;
  freightOfferSelected?: boolean;
  excludeActions?: ReadonlySet<OrderAction>;
  onRunAction: (action: OrderAction) => void;
}

export function OrderActionDrawer({
  open, onClose, state, actorRole, isOwner, isCounterparty, inspectionResult, productionPercent = 0, freightOfferSelected = true, excludeActions, onRunAction,
}: Props) {
  const { t } = useT();
  const allowed = computeOrderNextActions({
    state, actorRole, isOwner, isCounterparty, inspectionResult, productionPercent, freightOfferSelected,
  }).filter((a) => !excludeActions?.has(a.action));

  const primaryAction = orderScriptFor(state, toWorkspaceScriptRole(actorRole) ?? "BUYER")?.primaryAction;
  const otherActions = allowed.filter((a) => a.action !== primaryAction);
  const critical = otherActions.filter((a) => a.variant === "destructive");
  const secondary = otherActions.filter((a) => a.variant !== "destructive");

  const handle = (a: NextAction) => {
    onRunAction(a.action);
    onClose();
  };

  if (!otherActions.length) return null;

  return (
    <Drawer open={open} onClose={onClose} title={t("order.drawer.title")} testId="order-action-drawer">
      <div className="space-y-4 p-4">
        {secondary.length > 0 && (
          <div>
            <div className="dmx-eyebrow text-zinc-500 mb-2">{t("order.drawer.available")}</div>
            <ul className="space-y-1">
              {secondary.map((a) => (
                <li key={a.action}>
                  <button
                    type="button"
                    data-testid={`order-action-${a.action}`}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-paper-50 text-left"
                    onClick={() => handle(a)}
                  >
                    <span>{a.label}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {critical.length > 0 && (
          <div>
            <div className="dmx-eyebrow text-red-600 mb-2">{t("order.drawer.critical")}</div>
            <ul className="space-y-1">
              {critical.map((a) => (
                <li key={a.action}>
                  <Button
                    data-testid={`order-action-${a.action}`}
                    variant="destructive"
                    className="w-full justify-between"
                    onClick={() => handle(a)}
                  >
                    {a.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  );
}
