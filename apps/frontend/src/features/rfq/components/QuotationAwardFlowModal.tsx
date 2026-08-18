import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useT } from "@/i18n/useT";
import { rfqApi } from "../lib/rfq.api";
import { toast } from "@/store/toast.store";
import {
  buildVariationsFromQuotation,
  formatVariationSummary,
} from "../lib/offer-variations";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  rfqLineItemId: string;
  productTitle?: string;
  quotation: QuotationRowDTO | null;
  unitPrice?: number;
  currency?: string;
  onSuccess: () => void;
}

function fmtMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotationAwardFlowModal({
  open,
  onClose,
  workspaceId,
  rfqLineItemId,
  productTitle,
  quotation,
  unitPrice,
  currency = "USD",
  onSuccess,
}: Props) {
  const { t } = useT();
  const [rationale, setRationale] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setRationale("");
      setPending(false);
    }
  }, [open]);

  const canConfirmSelect = rationale.trim().length >= 15;

  const runFlow = async () => {
    if (!quotation) return;
    setPending(true);
    try {
      await rfqApi.action(workspaceId, "award_line_item", {
        payload: {
          rfqLineItemId,
          quotationId: quotation.id,
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

  const variations = buildVariationsFromQuotation(quotation);
  const summary = formatVariationSummary(variations, currency);
  const totalLabel = fmtMoney(currency, quotation.total);

  const priceLine = [
    `Total ${totalLabel}`,
    variations.length > 1 ? summary.headline : fmtMoney(currency, unitPrice ?? quotation.total),
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
      description={
        productTitle
          ? `${t("rfq.quotation.award.select.description")} — ${productTitle}`
          : t("rfq.quotation.award.select.description")
      }
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
        <div className="rounded-xl border border-paper-200 bg-paper-50/60 px-4 py-3 text-xs text-zinc-600">
          {variations.length > 1
            ? "All variations in this offer are awarded together as one package."
            : "This award applies to this product line only. Other products remain open for quotation."}
        </div>
        <div className="rounded-xl border border-paper-200 bg-paper-50/60 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{quotation.supplierName}</p>
            <p className="text-sm text-zinc-600 mt-0.5">{priceLine}</p>
            {summary.lines.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-500" data-testid="quotation-award-variations">
                {summary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
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
