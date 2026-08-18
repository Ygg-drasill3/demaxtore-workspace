import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUnsavedChangesBlocker } from "@/hooks/useUnsavedChangesBlocker";
import { toast } from "@/store/toast.store";
import { getApiErrorMessage } from "@/lib/api-errors";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { purchaseOrderKeys } from "../lib/purchase-order.query-keys";
import { purchaseOrderRoutes } from "../lib/purchase-order.routes";
import {
  buildSubmitPayload,
  validateFullWizard,
  validateStep,
  wizardHasMeaningfulData,
} from "../lib/direct-po-wizard.utils";
import { createInitialWizardState, WIZARD_STEPS, type DirectPoWizardState } from "../lib/direct-po-wizard.types";
import { Stepper } from "./Stepper";
import { SupplierStep } from "./steps/SupplierStep";
import { ProductsStep } from "./steps/ProductsStep";
import { CommercialTermsStep } from "./steps/CommercialTermsStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { ReviewStep } from "./steps/ReviewStep";

interface Props {
  defaultCurrency?: string;
}

export function DirectPurchaseOrderWizard({ defaultCurrency = "USD" }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<DirectPoWizardState>(() => createInitialWizardState(defaultCurrency));
  const [step, setStep] = useState(0);
  const [maxCompletedStep, setMaxCompletedStep] = useState(-1);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasUnsaved = useMemo(
    () => !submitted && wizardHasMeaningfulData(state),
    [state, submitted],
  );
  useUnsavedChangesBlocker(hasUnsaved);

  const patchState = (patch: Partial<DirectPoWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const goToStep = (index: number) => {
    if (index <= maxCompletedStep) {
      setStep(index);
      setErrors({});
    }
  };

  const handleContinue = () => {
    const result = validateStep(step, state);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setMaxCompletedStep((prev) => Math.max(prev, step));
    setStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCancel = () => {
    if (hasUnsaved && !window.confirm("You have unsaved changes. Leave this page?")) return;
    navigate("/buyer/purchase-orders");
  };

  const handleSubmit = async () => {
    const full = validateFullWizard(state);
    if (!full.ok) {
      setErrors(full.errors);
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    try {
      let document = state.document;
      if (document.file && !document.documentUrl) {
        const uploaded = await purchaseOrderApi.uploadDirectDocument(document.file);
        document = {
          file: document.file,
          documentUrl: uploaded.documentUrl,
          documentFileName: uploaded.documentFileName,
        };
        setState((prev) => ({ ...prev, document }));
      }

      const payload = buildSubmitPayload({ ...state, document });
      const idempotencyKey = crypto.randomUUID();
      const response = await purchaseOrderApi.createDirect(payload, idempotencyKey);
      setSubmitted(true);
      toast.success("Purchase order created", `PO ${response.poNumber} has been issued.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.recent() }),
        queryClient.invalidateQueries({ queryKey: ["buyer", "po-list"] }),
        queryClient.invalidateQueries({ queryKey: ["supplier", "po-list"] }),
      ]);
      if (response.orderId) {
        await queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.byOrder(response.orderId) });
      }
      navigate(purchaseOrderRoutes.detail(response.purchaseOrderId), { replace: true });
    } catch (err) {
      toast.error("Could not create purchase order", getApiErrorMessage(err, "Please review the form and try again."));
      setUploadError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === WIZARD_STEPS.length - 1;

  return (
    <div
      className="dmx-card overflow-hidden"
      data-testid="direct-po-wizard"
      data-dirty={hasUnsaved ? "true" : undefined}
      data-unsaved={hasUnsaved ? "true" : undefined}
    >
      <Stepper currentStep={step} maxCompletedStep={maxCompletedStep} onStepClick={goToStep} />

      <div className="px-4 py-5 sm:px-6">
        {step === 0 && (
          <SupplierStep
            state={state}
            errors={errors}
            onSelectSupplier={(supplier) => patchState({ supplier })}
          />
        )}
        {step === 1 && (
          <ProductsStep
            state={state}
            errors={errors}
            onChangeLines={(lines) => patchState({ lines })}
            onDocumentChange={(document) => patchState({ document })}
          />
        )}
        {step === 2 && (
          <CommercialTermsStep state={state} errors={errors} onChange={patchState} />
        )}
        {step === 3 && (
          <DocumentsStep
            state={state}
            onDocumentChange={(document) => patchState({ document })}
            uploadError={uploadError}
            uploading={submitting}
          />
        )}
        {step === 4 && <ReviewStep state={state} errors={errors} />}
      </div>

      <div className="sticky bottom-0 border-t border-paper-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={handleCancel} disabled={submitting}>
          Cancel
        </Button>
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting} className="inline-flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {!isLastStep ? (
            <Button type="button" onClick={handleContinue} className="inline-flex items-center gap-1">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" loading={submitting} onClick={() => void handleSubmit()}>
              Create purchase order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
