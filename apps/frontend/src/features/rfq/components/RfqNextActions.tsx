// apps/frontend/src/features/rfq/components/RfqNextActions.tsx
//
// Secondary RFQ actions — rendered inline below the hero card so buyers
// don't have to hunt for a hidden "More actions" menu.
//
import { computeRfqNextActions } from "@dmx/contracts/rfq.next-actions";
import { rfqHeroActions } from "../lib/rfq.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import { ActionDrawer } from "./ActionDrawer";
import type { RfqState, ActorRole } from "@dmx/contracts/rfq.fsm";

interface Props {
  workspaceId:    string;
  state:          RfqState;
  actor:          { id: string; role: ActorRole };
  isOwner:        boolean;
  isCounterparty: boolean;
  isSelectedSupplier?: boolean;
  hasQuotationFromUser?: boolean;
  helperText?: Partial<Record<string, string>>;
  onFocusCommunication?: () => void;
}

export function RfqNextActions(props: Props) {
  const { state, actor, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser } = props;

  const allowed = computeRfqNextActions({
    state, actorRole: actor.role, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser,
  });
  const scriptRole = toWorkspaceScriptRole(actor.role === "SYSTEM" ? "ADMIN" : actor.role) ?? "ADMIN";
  const heroActions = new Set(rfqHeroActions(state, scriptRole));
  const others = allowed.filter((a) => !heroActions.has(a.action));

  if (others.length === 0) return null;

  return (
    <ActionDrawer
      inline
      workspaceId={props.workspaceId}
      state={state}
      actor={actor}
      isOwner={isOwner}
      isCounterparty={isCounterparty}
      isSelectedSupplier={isSelectedSupplier}
      hasQuotationFromUser={hasQuotationFromUser}
      helperText={props.helperText}
      onFocusCommunication={props.onFocusCommunication}
    />
  );
}
