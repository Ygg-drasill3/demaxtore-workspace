// apps/frontend/src/features/rfq/components/RfqNextActions.tsx
//
// Sprint 2.5 — RfqNextActions is now JUST the "More actions ⋯" trigger.
// The primary CTA lives in WhatHappensNextCard. Everything else lives in
// ActionDrawer. This component owns only the drawer-open trigger and the
// "no actions" empty state, so the visual hierarchy stays consistent.
//
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionDrawer } from "./ActionDrawer";
import { computeRfqNextActions } from "@dmx/contracts/rfq.next-actions";
import { rfqScriptFor, RFQ_SCRIPTS } from "../lib/rfq.scripts";
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
  const [open, setOpen] = useState(false);

  const allowed = computeRfqNextActions({
    state, actorRole: actor.role, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser,
  });
  const scriptRole = actor.role === "SYSTEM" ? "ADMIN" : actor.role;
  const primary = rfqScriptFor(state, scriptRole)?.primaryAction ?? RFQ_SCRIPTS[state]?.primaryAction;
  const others = allowed.filter((a) => a.action !== primary);

  if (others.length === 0) return null;

  return (
    <>
      <div data-testid="rfq-next-actions" className="flex justify-end">
        <Button
          data-testid="rfq-more-actions-trigger"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal className="h-4 w-4" />
          More actions ({others.length})
        </Button>
      </div>

      <ActionDrawer
        workspaceId={props.workspaceId}
        open={open}
        onClose={() => setOpen(false)}
        state={state}
        actor={actor}
        isOwner={isOwner}
        isCounterparty={isCounterparty}
        isSelectedSupplier={isSelectedSupplier}
        hasQuotationFromUser={hasQuotationFromUser}
        helperText={props.helperText}
        onFocusCommunication={props.onFocusCommunication}
      />
    </>
  );
}
