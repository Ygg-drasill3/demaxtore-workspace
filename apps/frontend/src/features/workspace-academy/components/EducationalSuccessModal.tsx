// apps/frontend/src/features/workspace-academy/components/EducationalSuccessModal.tsx
//
// Educational transition after real commercial milestones (PO issued, shipment
// booked, RFQ submitted). Never auto-approves or mutates business state.
import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { useReducedMotion } from "@/motion";
import { springSnappy } from "@/motion/tokens";
import { useEducationalSuccess } from "../lib/educational-success.store";
import { WorkspaceFlowTransition } from "../motion/components/WorkspaceFlowTransition";

export function EducationalSuccessModal() {
  const { t } = useT();
  const navigate = useNavigate();
  const { track } = useTelemetry();
  const reduced = useReducedMotion();
  const payload = useEducationalSuccess((s) => s.payload);
  const dismiss = useEducationalSuccess((s) => s.dismiss);

  if (!payload) return null;

  const go = (href: string) => {
    track("academy.empty_state_action_used", {
      meta: {
        kind: payload.kind,
        hrefPattern: href.replace(/\/[0-9a-f-]{8,}|\b[a-z0-9-]{12,}\b/gi, ":id"),
      },
    });
    dismiss();
    navigate(href);
  };

  const flowVariant =
    payload.kind === "po_issued" ? "rfq-po-order" as const
      : payload.kind === "shipment_booked" ? "order-shipment" as const
        : null;

  const activeId =
    payload.kind === "po_issued" ? "po"
      : payload.kind === "shipment_booked" ? "shipment"
        : undefined;

  return (
    <Modal
      open
      onClose={dismiss}
      size="md"
      testId="academy-educational-success"
      title={t(payload.titleKey)}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={dismiss} data-testid="edu-success-close">
            {t("wa.tour.done")}
          </Button>
          {payload.actions.map((a) => (
            <Button
              key={a.href + a.labelKey}
              variant={a.primary ? "primary" : "secondary"}
              size="sm"
              onClick={() => go(a.href)}
              data-testid={`edu-success-action-${a.labelKey.split(".").pop()}`}
            >
              {t(a.labelKey)}
            </Button>
          ))}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <m.div
            className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center shrink-0"
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springSnappy}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </m.div>
          <p className="text-sm text-zinc-600 leading-relaxed">{t(payload.bodyKey)}</p>
        </div>

        {flowVariant && (
          <div data-testid="edu-success-chain">
            <WorkspaceFlowTransition
              variant={flowVariant}
              reducedMotion={reduced}
              activeId={activeId}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
