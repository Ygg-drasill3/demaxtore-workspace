// apps/frontend/src/features/rfq/components/ActionDrawer.tsx
//
// Sprint 2.5 — secondary + critical actions live here.
// Primary CTA lives inside WhatHappensNextCard (one per state).
//
import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { computeRfqNextActions, type NextAction } from "@dmx/contracts/rfq.next-actions";
import { RFQ_SCRIPTS } from "../lib/rfq.scripts";
import { useApplyRfqAction } from "../hooks";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import type { RfqState, ActorRole } from "@dmx/contracts/rfq.fsm";
import {
  PICKER_ACTIONS, AssignSuppliersPicker, SelectSupplierPicker, SubmitProformaPicker, IssuePoPicker,
} from "./ActionPickers";
import { rfqScriptFor } from "../lib/rfq.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import { focusRfqCommunication } from "../lib/focus-communication";
import { toast } from "@/store/toast.store";
import type { RfqAction } from "@dmx/contracts/rfq.fsm";
import { useT } from "@/i18n/useT";

interface Props {
  workspaceId:    string;
  open:           boolean;
  onClose:        () => void;
  state:          RfqState;
  actor:          { id: string; role: ActorRole };
  isOwner:        boolean;
  isCounterparty: boolean;
  isSelectedSupplier?:    boolean;
  hasQuotationFromUser?:  boolean;
  /** Inline helper text per action (extensions counter, SLA, etc.). */
  helperText?:    Partial<Record<string, string>>;
  onFocusCommunication?: () => void;
}

/** Actions that open the communication panel instead of calling the FSM API. */
const FOCUS_COMMUNICATION_ACTIONS: ReadonlySet<RfqAction> = new Set(["post_clarification"]);

export function ActionDrawer(props: Props) {
  const { t } = useT();
  const { workspaceId, open, onClose, state, actor, isOwner, isCounterparty,
          isSelectedSupplier, hasQuotationFromUser, helperText, onFocusCommunication } = props;
  const apply = useApplyRfqAction(workspaceId);
  const { track } = useTelemetry();
  const [pending, setPending]             = useState<NextAction | null>(null);
  const [reason, setReason]               = useState("");
  const [pickerAction, setPickerAction]   = useState<NextAction | null>(null);

  const allowed = computeRfqNextActions({
    state, actorRole: actor.role, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser,
  });

  // Exclude the state's primary action — it lives in the hero card, not here.
  const scriptRole = toWorkspaceScriptRole(actor.role === "SYSTEM" ? "ADMIN" : actor.role) ?? "ADMIN";
  const primaryAction = rfqScriptFor(state, scriptRole)?.primaryAction ?? RFQ_SCRIPTS[state]?.primaryAction;
  const otherActions = allowed.filter((a) => a.action !== primaryAction);

  const critical = otherActions.filter((a) => a.variant === "destructive");
  const secondary = otherActions.filter((a) => a.variant !== "destructive");

  const run = (a: NextAction) => {
    track("next_action.clicked", { workspaceId, targetId: a.action });
    if (FOCUS_COMMUNICATION_ACTIONS.has(a.action)) {
      (onFocusCommunication ?? focusRfqCommunication)();
      onClose();
      return;
    }
    if (PICKER_ACTIONS.has(a.action)) {
      setPickerAction(a);
      onClose();
      return;
    }
    if (a.requiresReason) { setPending(a); setReason(""); return; }
    if (a.requiresConfirmation) {
      const ok = window.confirm(`${a.label}\n\n${t("rfq.drawer.confirmUndo")}`);
      if (!ok) return;
    }
    apply.mutate({ action: a.action }, { onSuccess: () => onClose() });
  };

  const confirmPicker = (payload: Record<string, unknown>) => {
    if (!pickerAction) return;
    apply.mutate(
      { action: pickerAction.action, payload },
      {
        onSuccess: () => {
          if (pickerAction?.action === "submit_proforma") {
            toast.success(t("rfq.drawer.proformaSubmitted"), t("rfq.drawer.proformaSubmittedHint"));
          }
          setPickerAction(null);
          onClose();
        },
      },
    );
  };

  const confirmReason = () => {
    if (!pending) return;
    apply.mutate(
      { action: pending.action, reason },
      {
        onSuccess: () => {
          setPending(null);
          onClose();
        },
      },
    );
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={t("rfq.drawer.title")} width="md" testId="action-drawer">
        <div className="px-5 py-4 space-y-5">
          {otherActions.length === 0 && (
            <p className="text-sm text-zinc-500" data-testid="action-drawer-empty">
              {t("rfq.drawer.emptyState")}
            </p>
          )}

          {secondary.length > 0 && (
            <Section title={t("rfq.drawer.secondary")}>
              {secondary.map((a) => (
                <ActionTile key={a.action} action={a} helper={helperText?.[a.action]} onClick={() => run(a)}
                            loading={apply.isPending && apply.variables?.action === a.action} />
              ))}
            </Section>
          )}

          {critical.length > 0 && (
            <Section title={t("rfq.drawer.critical")} tone="danger">
              {critical.map((a) => (
                <ActionTile key={a.action} action={a} helper={helperText?.[a.action]} onClick={() => run(a)}
                            loading={apply.isPending && apply.variables?.action === a.action} critical />
              ))}
            </Section>
          )}
        </div>
      </Drawer>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.label ?? ""}
        description={t("rfq.drawer.reasonDescription")}
        size="md"
        testId="action-drawer-reason-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>{t("rfq.drawer.cancel")}</Button>
            <Button
              data-testid="action-drawer-reason-confirm"
              variant={pending?.variant === "destructive" ? "destructive" : "primary"}
              onClick={confirmReason}
              disabled={reason.trim().length < 15}
              loading={apply.isPending}
            >
              {t("rfq.drawer.confirm")}
            </Button>
          </>
        }
      >
        <Textarea
          data-testid="action-drawer-reason-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("rfq.drawer.reasonPlaceholder")}
          rows={4}
        />
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[
            t("rfq.drawer.rejectPreset.wrongSpecs"),
            t("rfq.drawer.rejectPreset.wrongCategory"),
            t("rfq.drawer.rejectPreset.insufficient"),
            t("rfq.drawer.rejectPreset.other"),
          ].map((preset) => (
            <button key={preset}
                    type="button"
                    onClick={() => setReason((r) => r ? r : preset + " — ")}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-paper-200 text-zinc-600 hover:bg-paper-50">
              {preset}
            </button>
          ))}
        </div>
      </Modal>

      {/* Sprint 2.6 — payload pickers for actions that need structured input. */}
      <AssignSuppliersPicker
        workspaceId={workspaceId}
        open={
          !!pickerAction &&
          (pickerAction.action === "assign_suppliers" || pickerAction.action === "add_more_suppliers")
        }
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <SelectSupplierPicker
        workspaceId={workspaceId}
        open={!!pickerAction && pickerAction.action === "select_supplier"}
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <SubmitProformaPicker
        workspaceId={workspaceId}
        open={!!pickerAction && pickerAction.action === "submit_proforma"}
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <IssuePoPicker
        workspaceId={workspaceId}
        open={!!pickerAction && pickerAction.action === "issue_po"}
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
    </>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "danger"; children: React.ReactNode }) {
  return (
    <div>
      <div className={"dmx-eyebrow mb-2 " + (tone === "danger" ? "text-red-700" : "text-zinc-500")}>
        ─── {title} ───
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface TileProps {
  action:   NextAction;
  helper?:  string;
  onClick:  () => void;
  loading?: boolean;
  critical?: boolean;
}

function ActionTile({ action, helper, onClick, loading, critical }: TileProps) {
  return (
    <button
      type="button"
      data-testid={`action-tile-${action.action}`}
      disabled={loading}
      onClick={onClick}
      className={`w-full text-left border rounded-lg px-4 py-3.5 transition-colors disabled:opacity-60 ${
        critical
          ? "bg-white hover:bg-red-50 border-red-200"
          : "bg-white hover:bg-paper-50 border-paper-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-900">
            {critical && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
            {action.label}
          </div>
          {action.description && <div className="text-xs text-zinc-500 mt-0.5">{action.description}</div>}
          {helper && <div className="text-[11px] text-zinc-400 mt-1">{helper}</div>}
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
      </div>
    </button>
  );
}
