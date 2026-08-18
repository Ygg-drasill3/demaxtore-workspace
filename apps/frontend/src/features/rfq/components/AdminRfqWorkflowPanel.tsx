// Admin-only: set RFQ state directly + shortcut workflow actions.
import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { RFQ_STATES } from "@dmx/contracts/rfq.fsm";
import { computeRfqNextActions, type NextAction } from "@dmx/contracts/rfq.next-actions";
import type { RfqState, RfqAction } from "@dmx/contracts/rfq.fsm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useApplyRfqAction } from "../hooks";
import { STATE_LABEL } from "../lib/state-labels";
import { useT } from "@/i18n/useT";
import {
  PICKER_ACTIONS, AssignSuppliersPicker, ReopenQuotationsPicker,
} from "./ActionPickers";

interface Props {
  workspaceId: string;
  state: RfqState;
  /** Render inside progress bar card (no outer chrome). */
  embedded?: boolean;
}

const HIDDEN_ADMIN_ACTIONS = new Set<RfqAction>([
  "create_rfq",
  "edit_rfq_draft",
  "submit_quotation",
  "revise_quotation",
  "withdraw_quotation",
  "submit_proforma",
  "decline_proforma",
  "add_observer",
  "remove_observer",
  "admin_set_state",
  "award_line_item",
  "revert_line_award",
  "mark_line_no_award",
  "deadline_reached",
  "deadline_reached_no_bids",
  "proforma_sla_expired",
  "sync_order_closed",
]);

const fieldSelectClass =
  "h-10 w-full rounded-lg border border-paper-200 bg-white px-3 text-sm text-ink-900 focus:border-accent-900 focus:outline-none focus:ring-2 focus:ring-accent-900/15";

export function AdminRfqWorkflowPanel({ workspaceId, state, embedded }: Props) {
  const { t } = useT();
  const apply = useApplyRfqAction(workspaceId);
  const [targetState, setTargetState] = useState<RfqState>(state);
  const [setStateReason, setSetStateReason] = useState("");
  const [pending, setPending] = useState<NextAction | null>(null);
  const [reason, setReason] = useState("");
  const [pickerAction, setPickerAction] = useState<NextAction | null>(null);

  useEffect(() => {
    setTargetState(state);
  }, [state]);

  const actions = useMemo(() => {
    return computeRfqNextActions({
      state,
      actorRole: "ADMIN",
      isOwner: false,
      isCounterparty: false,
    }).filter((a) => !HIDDEN_ADMIN_ACTIONS.has(a.action));
  }, [state]);

  const canApplyState =
    targetState !== state && setStateReason.trim().length >= 15;

  const applyState = () => {
    if (!canApplyState) return;
    const label = STATE_LABEL[targetState];
    const ok = window.confirm(
      t(
        "rfq.adminWorkflow.setStateConfirm",
        `Move this RFQ to "${label}"? Related data (quotes, awards) is not automatically cleared.`,
      ),
    );
    if (!ok) return;
    apply.mutate({
      action: "admin_set_state",
      payload: { targetState },
      reason: setStateReason.trim(),
    });
  };

  const run = (action: NextAction) => {
    if (PICKER_ACTIONS.has(action.action)) {
      setPickerAction(action);
      return;
    }
    if (action.requiresReason) {
      setPending(action);
      setReason("");
      return;
    }
    if (action.requiresConfirmation) {
      const ok = window.confirm(`${action.label}\n\n${action.description}`);
      if (!ok) return;
    }
    apply.mutate({ action: action.action });
  };

  const confirmReason = () => {
    if (!pending) return;
    apply.mutate(
      { action: pending.action, reason },
      { onSuccess: () => setPending(null) },
    );
  };

  const confirmPicker = (payload: Record<string, unknown>) => {
    if (!pickerAction) return;
    const reasonText = typeof payload.reason === "string" ? payload.reason : undefined;
    apply.mutate(
      { action: pickerAction.action, payload, reason: reasonText },
      { onSuccess: () => setPickerAction(null) },
    );
  };

  return (
    <>
      <section
        data-testid="admin-rfq-workflow-panel"
        className={
          embedded
            ? "mt-4 pt-4 border-t border-indigo-200/80 rounded-xl bg-indigo-50/50 px-4 pb-4 -mx-1 sm:px-5"
            : "dmx-card p-5 sm:p-6 border-indigo-200 bg-indigo-50/40 animate-fade-in"
        }
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-800 grid place-items-center shrink-0">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink-900">
              {t("rfq.adminWorkflow.title", "Manage RFQ workflow")}
            </h2>
            <p className="text-sm text-zinc-600 mt-0.5">
              {t(
                "rfq.adminWorkflow.hint",
                "Set any workflow stage directly, or use a shortcut action below.",
              )}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {t("rfq.adminWorkflow.current", "Current stage")}:{" "}
              <span className="font-medium text-ink-900">{STATE_LABEL[state]}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200/80 bg-white p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            {t("rfq.adminWorkflow.setStateTitle", "Set RFQ state")}
          </p>
          <label className="block">
            <span className="text-xs text-zinc-600 mb-1 block">
              {t("rfq.adminWorkflow.targetState", "Target stage")}
            </span>
            <select
              data-testid="admin-workflow-target-state"
              value={targetState}
              onChange={(e) => setTargetState(e.target.value as RfqState)}
              className={fieldSelectClass}
            >
              {RFQ_STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABEL[s]}
                  {s === state ? ` (${t("rfq.adminWorkflow.currentShort", "current")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-zinc-600 mb-1 block">
              {t("rfq.adminWorkflow.reason", "Reason (min. 15 characters)")}
            </span>
            <Textarea
              data-testid="admin-workflow-set-state-reason"
              value={setStateReason}
              onChange={(e) => setSetStateReason(e.target.value)}
              placeholder={t(
                "rfq.adminWorkflow.reasonPlaceholder",
                "Why are you changing the RFQ stage?",
              )}
              rows={3}
            />
          </label>
          <Button
            data-testid="admin-workflow-apply-state"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={!canApplyState}
            loading={apply.isPending && apply.variables?.action === "admin_set_state"}
            onClick={applyState}
          >
            {t("rfq.adminWorkflow.applyState", "Apply state")}
          </Button>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t(
              "rfq.adminWorkflow.warning",
              "Admin override does not remove quotations, awards, or orders. Use only for corrections.",
            )}
          </p>
        </div>

        {actions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">
              {t("rfq.adminWorkflow.shortcuts", "Shortcut actions")}
            </p>
            {actions.map((action) => (
              <button
                key={action.action}
                type="button"
                data-testid={`admin-workflow-${action.action}`}
                disabled={apply.isPending}
                onClick={() => run(action)}
                className="w-full text-left border border-paper-200 bg-white hover:bg-paper-50 rounded-lg px-4 py-3 transition-colors disabled:opacity-60"
              >
                <div className="text-sm font-medium text-ink-900">{action.label}</div>
                {action.description && (
                  <div className="text-xs text-zinc-500 mt-0.5">{action.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.label ?? ""}
        description={t("rfq.drawer.reasonDescription")}
        size="md"
        testId="admin-workflow-reason-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t("rfq.drawer.cancel", "Cancel")}
            </Button>
            <Button
              data-testid="admin-workflow-reason-confirm"
              variant={pending?.variant === "destructive" ? "destructive" : "primary"}
              onClick={confirmReason}
              disabled={reason.trim().length < 15}
              loading={apply.isPending}
            >
              {t("rfq.drawer.confirm", "Confirm")}
            </Button>
          </>
        }
      >
        <Textarea
          data-testid="admin-workflow-reason-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("rfq.drawer.reasonPlaceholder")}
          rows={4}
        />
      </Modal>

      <AssignSuppliersPicker
        workspaceId={workspaceId}
        pickerAction={pickerAction?.action}
        open={
          !!pickerAction &&
          (pickerAction.action === "assign_suppliers" ||
            pickerAction.action === "add_more_suppliers" ||
            pickerAction.action === "update_supplier_scopes")
        }
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <ReopenQuotationsPicker
        workspaceId={workspaceId}
        open={!!pickerAction && pickerAction.action === "reopen_quotations"}
        onClose={() => setPickerAction(null)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
    </>
  );
}
