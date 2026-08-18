// apps/frontend/src/features/rfq/components/WhatHappensNextCard.tsx
//
// Sprint 2.5 hero component.
// Renders the canonical state→script copy from rfq.scripts.ts. NEVER hardcodes
// state copy here. Embeds the single primary CTA inline.
//
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { RfqState, RfqAction } from "@dmx/contracts/rfq.fsm";
import { focusRfqCommunication } from "../lib/focus-communication";
import { computeRfqNextActions, type NextAction } from "@dmx/contracts/rfq.next-actions";
import { rfqScriptFor, formatScript, resolveScriptHref, type RfqScript, type ScriptMood } from "../lib/rfq.scripts";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useApplyRfqAction } from "../hooks";
import { toast } from "@/store/toast.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { showPoIssuedSuccess } from "@/features/workspace-academy";
import { rfqApi } from "../lib/rfq.api";
import { rfqWorkspacePath } from "../lib/rfq-path";
import {
  PICKER_ACTIONS, AssignSuppliersPicker, SelectSupplierPicker, SubmitProformaPicker, IssuePoPicker, IssueSupplierPoPicker,
  ReopenQuotationsPicker,
} from "./ActionPickers";
import { Textarea } from "@/components/ui/Input";

export interface WhatHappensNextCardProps {
  workspaceId:    string;
  state:          RfqState;
  /** Variable bag the script template uses to render `{{...}}` placeholders. */
  vars:           Record<string, string | number | null | undefined>;
  /** Required to resolve the right NextAction descriptor for the primary CTA. */
  actor:          { id: string; role: "BUYER" | "SUPPLIER" | "ADMIN" };
  isOwner:        boolean;
  isCounterparty: boolean;
  isSelectedSupplier?: boolean;
  hasQuotationFromUser?: boolean;
  /** Called by parent so the consumer can scroll/highlight related panels. */
  onPrimaryClick?: (action: NextAction | null) => void;
}

const FOCUS_COMMUNICATION_ACTIONS: ReadonlySet<RfqAction> = new Set(["post_clarification"]);

const MOOD_STYLES: Record<ScriptMood, { bg: string; border: string; check: string; arrow: string }> = {
  active:         { bg: "bg-white",      border: "border-paper-200",     check: "text-emerald-600", arrow: "text-accent-900" },
  waiting:        { bg: "bg-paper-50",   border: "border-paper-200",     check: "text-accent-900",  arrow: "text-zinc-500" },
  action:         { bg: "bg-accent-50",  border: "border-accent-900/15", check: "text-accent-900",  arrow: "text-accent-900" },
  returned:       { bg: "bg-red-50",     border: "border-red-200",       check: "text-amber-600",   arrow: "text-red-600" },
  "terminal-plus":  { bg: "bg-emerald-50", border: "border-emerald-200",   check: "text-emerald-700", arrow: "text-emerald-700" },
  "terminal-minus": { bg: "bg-paper-50",   border: "border-paper-200",     check: "text-zinc-500",    arrow: "text-zinc-500" },
};

export function WhatHappensNextCard(props: WhatHappensNextCardProps) {
  const { state, vars, actor, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser, workspaceId, onPrimaryClick } = props;
  const navigate = useNavigate();

  const script: RfqScript | undefined = rfqScriptFor(state, actor.role);
  const fallbackHref = useMemo(() => {
    const href = script?.fallbackPrimary?.href;
    if (!href) return null;
    return resolveScriptHref(href, vars);
  }, [script, vars]);
  const showFallbackPrimary = !!script?.fallbackPrimary && (!!script.fallbackPrimary.action || !!fallbackHref);
  const mood = MOOD_STYLES[script?.mood ?? "waiting"];
  const { track } = useTelemetry();
  const apply = useApplyRfqAction(workspaceId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [promotedPicker, setPromotedPicker] = useState<NextAction | null>(null);
  const [pendingPromoted, setPendingPromoted] = useState<NextAction | null>(null);
  const [promotedReason, setPromotedReason] = useState("");

  // Resolve primary action descriptor (with FSM permission check).
  const primaryNextAction = useMemo<NextAction | null>(() => {
    if (!script || !script.primaryAction) return null;
    const allowed = computeRfqNextActions({
      state, actorRole: actor.role, isOwner, isCounterparty,
      isSelectedSupplier, hasQuotationFromUser,
    });
    return allowed.find((a) => a.action === script.primaryAction) ?? null;
  }, [script, state, actor.role, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser]);

  const promotedNextActions = useMemo<NextAction[]>(() => {
    if (!script?.promotedSecondaryActions?.length) return [];
    const allowed = computeRfqNextActions({
      state, actorRole: actor.role, isOwner, isCounterparty,
      isSelectedSupplier, hasQuotationFromUser,
    });
    return script.promotedSecondaryActions
      .map((action) => allowed.find((a) => a.action === action))
      .filter((a): a is NextAction => !!a);
  }, [script, state, actor.role, isOwner, isCounterparty, isSelectedSupplier, hasQuotationFromUser]);

  // Defensive fallback if state isn't in the table.
  if (!script) {
    return (
      <div data-testid="what-happens-next-fallback"
           className="dmx-card p-6 bg-paper-50 border-paper-200 animate-fade-in">
        <div className="dmx-eyebrow">What happens next</div>
        <p className="text-sm text-zinc-600 mt-2">DeMaxtore is processing this update.</p>
      </div>
    );
  }

  const past   = formatScript(script.past,           vars);
  const future = formatScript(script.future,         vars);
  const statL  = { label: script.statL.label, value: formatScript(script.statL.value, vars) };
  const statR  = { label: script.statR.label, value: formatScript(script.statR.value, vars) };

  const handlePrimary = () => {
    track("next_action.clicked", { workspaceId, targetId: primaryNextAction?.action ?? "fallback" });
    if (primaryNextAction && FOCUS_COMMUNICATION_ACTIONS.has(primaryNextAction.action)) {
      onPrimaryClick?.(primaryNextAction);
      focusRfqCommunication();
      return;
    }
    if (primaryNextAction && PICKER_ACTIONS.has(primaryNextAction.action)) {
      setPickerOpen(true);
      return;
    }
    if (primaryNextAction?.requiresReason) {
      setPendingPromoted(primaryNextAction);
      setPromotedReason("");
      return;
    }
    if (primaryNextAction?.requiresConfirmation) {
      const ok = window.confirm(`${primaryNextAction.label}\n\n${primaryNextAction.description || "This cannot be undone."}`);
      if (!ok) return;
    }
    if (primaryNextAction && !primaryNextAction.requiresReason && !primaryNextAction.requiresConfirmation) {
      apply.mutate({ action: primaryNextAction.action });
    } else if (primaryNextAction) {
      apply.mutate({ action: primaryNextAction.action });
    }
    onPrimaryClick?.(primaryNextAction);
  };

  const handlePromoted = (action: NextAction) => {
    track("next_action.clicked", { workspaceId, targetId: action.action });
    if (PICKER_ACTIONS.has(action.action)) {
      setPromotedPicker(action);
      return;
    }
    if (action.requiresReason) {
      setPendingPromoted(action);
      setPromotedReason("");
      return;
    }
    if (action.requiresConfirmation) {
      const ok = window.confirm(`${action.label}\n\n${action.description || "This cannot be undone."}`);
      if (!ok) return;
    }
    apply.mutate({ action: action.action });
  };

  const confirmPromotedReason = () => {
    if (!pendingPromoted) return;
    apply.mutate(
      { action: pendingPromoted.action, reason: promotedReason },
      { onSuccess: () => setPendingPromoted(null) },
    );
  };

  const confirmPromotedPicker = (payload: Record<string, unknown>) => {
    if (!promotedPicker) return;
    const reasonText = typeof payload.reason === "string" ? payload.reason : undefined;
    apply.mutate(
      { action: promotedPicker.action, payload, reason: reasonText },
      { onSuccess: () => setPromotedPicker(null) },
    );
  };

  const confirmPicker = (payload: Record<string, unknown>) => {
    if (!primaryNextAction) return;
    apply.mutate(
      { action: primaryNextAction.action, payload },
      {
        onSuccess: async () => {
          if (primaryNextAction?.action === "submit_proforma") {
            toast.success("Proforma submitted", "The buyer can now review your invoice.");
          }
          if (primaryNextAction?.action === "issue_po") {
            try {
              const spawned = await rfqApi.spawnedOrders(workspaceId) as Array<{ id: string }>;
              const orderId = spawned?.[0]?.id ?? null;
              // PO workspace id is not always returned here; Order is the primary next step.
              showPoIssuedSuccess({
                orderWorkspaceId: orderId,
                rfqWorkspacePath: rfqWorkspacePath({ id: workspaceId }),
              });
            } catch {
              showPoIssuedSuccess({
                rfqWorkspacePath: rfqWorkspacePath({ id: workspaceId }),
              });
            }
          }
          setPickerOpen(false);
        },
      },
    );
  };

  const pickerAction = primaryNextAction?.action;

  return (
    <section
      data-testid="what-happens-next" data-guide="proforma-panel"
      data-state={state}
      data-mood={script.mood}
      className={cn("rounded-2xl border p-6 sm:p-7 animate-fade-in", mood.bg, mood.border)}
    >
      <div className="dmx-eyebrow text-zinc-500">What happens next</div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className={cn("h-4 w-4 mt-0.5 shrink-0", mood.check)} />
          <p data-testid="whn-past" className="text-sm text-ink-900">{past}</p>
        </div>
        <div className="flex items-start gap-2.5">
          <ArrowRight className={cn("h-4 w-4 mt-0.5 shrink-0", mood.arrow)} />
          <p data-testid="whn-future" className="text-sm text-ink-900 leading-relaxed">{future}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label={statL.label} value={statL.value} testId="whn-stat-left" />
        <Stat label={statR.label} value={statR.value} testId="whn-stat-right" />
      </div>

      {(primaryNextAction || showFallbackPrimary || promotedNextActions.length > 0) && (
        <div className="mt-5 space-y-2">
          {primaryNextAction ? (
            <Button
              data-guide="proforma-review"
              data-testid={primaryNextAction ? `whn-primary-cta-${primaryNextAction.action}` : "whn-primary-cta"}
              size="lg"
              className="w-full"
              variant={primaryNextAction.variant === "destructive" ? "destructive" : "primary"}
              onClick={handlePrimary}
              loading={apply.isPending}
            >
              {script.primaryLabel ?? primaryNextAction.label}
            </Button>
          ) : showFallbackPrimary ? (
            <Button
              data-testid="whn-fallback-cta"
              size="lg"
              className="w-full"
              variant={script.fallbackPrimary?.tone === "ghost" ? "ghost" : "secondary"}
              onClick={() => {
                onPrimaryClick?.(null);
                if (fallbackHref) navigate(fallbackHref);
              }}
            >
              {script.fallbackPrimary?.label}
            </Button>
          ) : null}
          {primaryNextAction && showFallbackPrimary && fallbackHref ? (
            <Button
              data-testid="whn-fallback-cta"
              size="lg"
              className="w-full"
              variant={script.fallbackPrimary?.tone === "ghost" ? "ghost" : "secondary"}
              onClick={() => {
                onPrimaryClick?.(null);
                navigate(fallbackHref);
              }}
            >
              {script.fallbackPrimary?.label}
            </Button>
          ) : null}
          {promotedNextActions.map((action) => (
            <Button
              key={action.action}
              data-testid={`whn-promoted-cta-${action.action}`}
              size="lg"
              className="w-full"
              variant={action.variant === "destructive" ? "destructive" : "secondary"}
              onClick={() => handlePromoted(action)}
              loading={apply.isPending && apply.variables?.action === action.action}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Sprint 2.6 — picker modals invoked by the primary CTA when the action
          requires a structured payload (assign_suppliers / select_supplier / issue_po). */}
      <AssignSuppliersPicker
        workspaceId={workspaceId}
        pickerAction={pickerAction ?? undefined}
        open={
          pickerOpen &&
          (pickerAction === "assign_suppliers" ||
            pickerAction === "add_more_suppliers" ||
            pickerAction === "update_supplier_scopes")
        }
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <SelectSupplierPicker
        workspaceId={workspaceId}
        open={pickerOpen && pickerAction === "select_supplier"}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <SubmitProformaPicker
        workspaceId={workspaceId}
        open={pickerOpen && pickerAction === "submit_proforma"}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <IssuePoPicker
        workspaceId={workspaceId}
        open={pickerOpen && pickerAction === "issue_po"}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <IssueSupplierPoPicker
        workspaceId={workspaceId}
        open={pickerOpen && pickerAction === "issue_supplier_po"}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
        isPending={apply.isPending}
      />
      <ReopenQuotationsPicker
        workspaceId={workspaceId}
        open={!!promotedPicker && promotedPicker.action === "reopen_quotations"}
        onClose={() => setPromotedPicker(null)}
        onConfirm={confirmPromotedPicker}
        isPending={apply.isPending}
      />

      <Modal
        open={!!pendingPromoted}
        onClose={() => setPendingPromoted(null)}
        title={pendingPromoted?.label ?? ""}
        description="Please provide a reason for this workflow change (at least 15 characters)."
        size="md"
        testId="whn-promoted-reason-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingPromoted(null)}>Cancel</Button>
            <Button
              data-testid="whn-promoted-reason-confirm"
              variant={pendingPromoted?.variant === "destructive" ? "destructive" : "primary"}
              onClick={confirmPromotedReason}
              disabled={promotedReason.trim().length < 15}
              loading={apply.isPending}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Textarea
          data-testid="whn-promoted-reason-textarea"
          value={promotedReason}
          onChange={(e) => setPromotedReason(e.target.value)}
          placeholder="Explain why you are changing the RFQ stage…"
          rows={4}
        />
      </Modal>
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div data-testid={testId} className="bg-white/70 border border-paper-200 rounded-lg px-3.5 py-2.5">
      <div className="dmx-eyebrow text-zinc-500 leading-tight">{label}</div>
      <div className="text-sm font-medium text-ink-900 mt-1 tabular-nums leading-snug">{value}</div>
    </div>
  );
}
