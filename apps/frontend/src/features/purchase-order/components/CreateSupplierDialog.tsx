import { useState } from "react";
import { CreateMinimalSupplierSchema } from "@dmx/contracts/purchase-order.zod";
import type { CreateMinimalSupplierInput, SupplierSearchItem } from "@dmx/contracts/purchase-order.zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { getApiErrorCode } from "../lib/direct-po-wizard.utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: SupplierSearchItem) => void;
}

const emptyForm = (): CreateMinimalSupplierInput => ({
  companyName: "",
  countryCode: "",
  contactName: null,
  email: null,
  phone: null,
  registrationNumber: null,
  address: null,
  website: null,
});

export function CreateSupplierDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setForm(emptyForm());
    setErrors({});
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const setField = <K extends keyof CreateMinimalSupplierInput>(
    key: K,
    value: CreateMinimalSupplierInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const parsed = CreateMinimalSupplierSchema.safeParse({
      ...form,
      contactName: form.contactName?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      registrationNumber: form.registrationNumber?.trim() || null,
      address: form.address?.trim() || null,
      website: form.website?.trim() || null,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message;
      });
      setErrors(next);
      return;
    }

    setBusy(true);
    try {
      const supplier = await purchaseOrderApi.createMinimalSupplier(parsed.data);
      onCreated(supplier);
      handleClose();
    } catch (err) {
      if (getApiErrorCode(err) === "SUPPLIER_ALREADY_EXISTS") {
        setSubmitError("Supplier already exists. Please select the existing supplier.");
      } else {
        const ax = err as { response?: { data?: { error?: { message?: string } } } };
        setSubmitError(ax.response?.data?.error?.message ?? "Could not create supplier.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create supplier"
      description="Add a minimal supplier record for this purchase order."
      size="lg"
      testId="create-supplier-dialog"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" loading={busy} onClick={() => void handleSubmit()}>
            Create supplier
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs text-zinc-600 sm:col-span-2">
          Company name <span className="text-red-600">*</span>
          <input
            className="dmx-input mt-1"
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            aria-invalid={!!errors.companyName}
          />
          {errors.companyName && (
            <span className="mt-1 block text-xs text-red-600" role="alert">
              {errors.companyName}
            </span>
          )}
        </label>

        <label className="block text-xs text-zinc-600">
          Country <span className="text-red-600">*</span>
          <input
            className="dmx-input mt-1"
            maxLength={100}
            value={form.countryCode}
            onChange={(e) => setField("countryCode", e.target.value)}
            placeholder="e.g. Turkey"
            aria-invalid={!!errors.countryCode}
          />
          {errors.countryCode && (
            <span className="mt-1 block text-xs text-red-600" role="alert">
              {errors.countryCode}
            </span>
          )}
        </label>

        <label className="block text-xs text-zinc-600">
          Contact name
          <input
            className="dmx-input mt-1"
            value={form.contactName ?? ""}
            onChange={(e) => setField("contactName", e.target.value)}
          />
        </label>

        <label className="block text-xs text-zinc-600">
          Email
          <input
            type="email"
            className="dmx-input mt-1"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <span className="mt-1 block text-xs text-red-600" role="alert">
              {errors.email}
            </span>
          )}
        </label>

        <label className="block text-xs text-zinc-600">
          Phone
          <input
            className="dmx-input mt-1"
            value={form.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </label>

        <label className="block text-xs text-zinc-600">
          Registration number
          <input
            className="dmx-input mt-1"
            value={form.registrationNumber ?? ""}
            onChange={(e) => setField("registrationNumber", e.target.value)}
          />
        </label>

        <label className="block text-xs text-zinc-600 sm:col-span-2">
          Address
          <textarea
            className="dmx-input mt-1 min-h-[72px]"
            value={form.address ?? ""}
            onChange={(e) => setField("address", e.target.value)}
          />
        </label>

        <label className="block text-xs text-zinc-600 sm:col-span-2">
          Website
          <input
            type="url"
            className="dmx-input mt-1"
            value={form.website ?? ""}
            onChange={(e) => setField("website", e.target.value)}
            placeholder="https://"
            aria-invalid={!!errors.website}
          />
          {errors.website && (
            <span className="mt-1 block text-xs text-red-600" role="alert">
              {errors.website}
            </span>
          )}
        </label>
      </div>

      {submitError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}
    </Modal>
  );
}
