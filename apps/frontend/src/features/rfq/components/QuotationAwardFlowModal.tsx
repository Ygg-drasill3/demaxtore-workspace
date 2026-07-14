import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useT } from "@/i18n/useT";
import { rfqApi } from "../lib/rfq.api";
import { toast } from "@/store/toast.store";

type Step = "confirm_close" | "select_supplier";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  state: RfqState;
  quotation: QuotationRowDTO | null;
  unitPrice?: number;
  currency?: string;
  onSuccess: () => void;
}

function needsCloseStep(state: RfqState) {
  return state === "RFQ_OPEN" || state === "QUOTATIONS_CLOSED";
}

function fmtMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotationAwardFlowModal({
  open,
  onClose,
  workspaceId,
  state,
  quotation,
  unitPrice,
  currency = "USD",
  onSuccess,
}: Props) {
  const { t } = useT();
  const [step, setStep] = useState<Step>(needsCloseStep(state) ? "confirm_close" : "select_supplier");
  const [rationale, setRationale] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setRationale("");
      setPending(false);
      setStep(needsCloseStep(state) ? "confirm_close" : "select_supplier");
    }
  }, [open, state]);

  const canConfirmSelect = rationale.trim().length >= 15;

  const runFlow = async () => {
    if (!quotation) return;
    setPending(true);
    try {
      if (state === "RFQ_OPEN") {
        await rfqApi.action(workspaceId, "close_quotations_early");
      }
      if (state === "RFQ_OPEN" || state === "QUOTATIONS_CLOSED") {
        await rfqApi.action(workspaceId, "start_evaluation");
      }
      await rfqApi.action(workspaceId, "select_supplier", {
        payload: {
          quotationId: quotation.id,
          supplierUserId: quotation.supplierId,
          rationale: rationale.trim(),
        },
      });
      toast.success(t("rfq.quotation.award.success"));
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t("rfq.quotation.award.error");
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  if (!quotation) return null;

  if (step === "confirm_close") {
    const isOpen = state === "RFQ_OPEN";
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t(isOpen ? "rfq.quotation.award.closeOpen.title" : "rfq.quotation.award.closeClosed.title")}
        description={t(
          isOpen ? "rfq.quotation.award.closeOpen.description" : "rfq.quotation.award.closeClosed.description",
        )}
        size="md"
        testId="quotation-award-close-modal"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              {t("rfq.quotation.award.decline")}
            </Button>
            <Button
              variant="primary"
              data-testid="quotation-award-close-confirm"
              loading={pending}
              onClick={() => setStep("select_supplier")}
            >
              {t("rfq.quotation.award.confirmContinue")}
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{quotation.supplierName}</p>
          <p className="text-xs mt-1 text-amber-800">
            {t("rfq.quotation.award.pendingQuote", undefined, {
              price: fmtMoney(currency, unitPrice ?? quotation.total),
            })}
          </p>
        </div>
      </Modal>
    );
  }

  const priceLine = [
    fmtMoney(currency, unitPrice ?? quotation.total),
    quotation.incoterm ?? null,
    quotation.leadTimeDays != null
      ? t("rfq.quotation.award.leadTime", undefined, { days: quotation.leadTimeDays })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("rfq.quotation.award.select.title")}
      description={t("rfq.quotation.award.select.description")}
      size="lg"
      testId="quotation-award-select-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            data-testid="quotation-award-select-confirm"
            disabled={!canConfirmSelect}
            loading={pending}
            onClick={() => void runFlow()}
          >
            {t("rfq.quotation.award.selectConfirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-paper-200 bg-paper-50/60 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{quotation.supplierName}</p>
            <p className="text-sm text-zinc-600 mt-0.5">{priceLine}</p>
            <p className="text-xs text-emerald-700 mt-1">{t("rfq.quotation.award.verifiedManufacturer")}</p>
          </div>
        </div>
        <Textarea
          data-testid="quotation-award-rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder={t("rfq.quotation.award.rationalePlaceholder")}
          rows={4}
        />
        <p className="text-xs text-zinc-500">{t("rfq.quotation.award.selectFootnote")}</p>
      </div>
    </Modal>
  );
}
