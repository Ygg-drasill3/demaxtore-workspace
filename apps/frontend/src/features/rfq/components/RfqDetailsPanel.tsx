import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import type { RfqDTO, EditRfqDraftInput } from "@dmx/contracts/rfq.zod";
import { INCOTERM_VALUES } from "@dmx/contracts/rfq.zod";
import { RfqDescriptionView } from "./RfqDescriptionView";
import { RfqCatalogIntakePanel } from "./RfqCatalogIntakePanel";
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, CardFooter } from "@/components/ui/Card";
import { rfqApi } from "../lib/rfq.api";
import { rfqQueryKeys } from "../hooks";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

type LineItemForm = {
  description: string;
  quantity: string;
  uom: string;
  notes: string;
};

type Props = {
  rfq: RfqDTO;
  isOwner: boolean;
  /** Supplier view — hide buyer identity and contact intake. */
  hideBuyerFields?: boolean;
};

const CURRENCIES = ["USD", "EUR", "GBP"] as const;

function toForm(rfq: RfqDTO) {
  return {
    title: rfq.title,
    productCategory: rfq.productCategory,
    productDescription: rfq.productDescription,
    targetMarket: rfq.targetMarket,
    incoterm: rfq.incoterm,
    currency: rfq.currency ?? "USD",
    deadlineAt: rfq.deadlineAt ? rfq.deadlineAt.slice(0, 16) : "",
    lineItems: (rfq.lineItems ?? []).map((li) => ({
      description: li.description,
      quantity: String(li.quantity),
      uom: li.uom,
      notes: li.notes ?? "",
    })),
  };
}

function emptyLineItem(): LineItemForm {
  return { description: "", quantity: "1", uom: "PCS", notes: "" };
}

export function RfqDetailsPanel({ rfq, isOwner, hideBuyerFields = false }: Props) {
  const { t } = useT();
  const qc = useQueryClient();
  const canEdit = isOwner && rfq.state === "RFQ_DRAFT";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(rfq));

  useEffect(() => {
    if (!editing) setForm(toForm(rfq));
  }, [rfq, editing]);

  const saveMutation = useMutation({
    mutationFn: (input: EditRfqDraftInput) => rfqApi.editDraft(rfq.id, input),
    onSuccess: (updated) => {
      qc.setQueryData(rfqQueryKeys.one(rfq.id), updated);
      qc.invalidateQueries({ queryKey: ["rfq", "list"] });
      toast.success(t("rfq.details.saved"));
      setEditing(false);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? t("rfq.details.saveFailed"));
    },
  });

  const handleSave = () => {
    const lineItems = form.lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: Number(li.quantity),
        uom: li.uom.trim() || "PCS",
        notes: li.notes.trim() || undefined,
      }));

    if (lineItems.length === 0) {
      toast.error(t("rfq.details.lineItemsRequired"));
      return;
    }

    saveMutation.mutate({
      title: form.title.trim(),
      productCategory: form.productCategory.trim(),
      productDescription: form.productDescription.trim(),
      targetMarket: form.targetMarket.trim(),
      incoterm: form.incoterm,
      currency: form.currency as "USD" | "EUR" | "GBP",
      deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : undefined,
      lineItems,
    });
  };

  const updateLine = (index: number, patch: Partial<LineItemForm>) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li, i) => (i === index ? { ...li, ...patch } : li)),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, emptyLineItem()] }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const fieldClass =
    "w-full h-9 px-3 rounded-md border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500";
  const textareaClass =
    "w-full px-3 py-2 rounded-md border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-y min-h-[80px]";

  return (
    <Card data-testid="rfq-details-panel">
      <CardHeader>
        <div>
          <CardEyebrow>{t("rfq.details.eyebrow")}</CardEyebrow>
          <CardTitle className="mt-1">{t("rfq.details.title")}</CardTitle>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            data-testid="rfq-details-edit"
            className="dmx-btn-secondary text-sm inline-flex items-center gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("rfq.details.edit")}
          </button>
        )}
      </CardHeader>

      <CardBody className="space-y-5">
        {editing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("rfq.details.field.title")}>
                <input
                  className={fieldClass}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </Field>
              <Field label={t("rfq.details.field.category")}>
                <input
                  className={fieldClass}
                  value={form.productCategory}
                  onChange={(e) => setForm((p) => ({ ...p, productCategory: e.target.value }))}
                />
              </Field>
              <Field label={t("rfq.details.field.targetMarket")}>
                <input
                  className={fieldClass}
                  value={form.targetMarket}
                  onChange={(e) => setForm((p) => ({ ...p, targetMarket: e.target.value }))}
                />
              </Field>
              <Field label={t("rfq.details.field.deadline")}>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.deadlineAt}
                  onChange={(e) => setForm((p) => ({ ...p, deadlineAt: e.target.value }))}
                />
              </Field>
              <Field label={t("rfq.details.field.incoterm")}>
                <select
                  className={fieldClass}
                  value={form.incoterm}
                  onChange={(e) => setForm((p) => ({ ...p, incoterm: e.target.value as typeof form.incoterm }))}
                >
                  {INCOTERM_VALUES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("rfq.details.field.currency")}>
                <select
                  className={fieldClass}
                  value={form.currency}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      currency: e.target.value as (typeof CURRENCIES)[number],
                    }))
                  }
                >
                  {CURRENCIES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t("rfq.details.field.description")}>
              <textarea
                className={textareaClass}
                rows={5}
                value={form.productDescription}
                onChange={(e) => setForm((p) => ({ ...p, productDescription: e.target.value }))}
              />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {t("rfq.details.lineItems")}
                </span>
                <button type="button" className="text-xs text-accent-900 hover:underline inline-flex items-center gap-1" onClick={addLine}>
                  <Plus className="h-3 w-3" /> {t("rfq.details.addLine")}
                </button>
              </div>
              <div className="space-y-2">
                {form.lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                    <div className="col-span-12 md:col-span-5">
                      <input
                        placeholder={t("rfq.details.field.lineDescription")}
                        className={fieldClass}
                        value={li.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="Qty"
                        className={fieldClass}
                        value={li.quantity}
                        onChange={(e) => updateLine(i, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        placeholder="UOM"
                        className={fieldClass}
                        value={li.uom}
                        onChange={(e) => updateLine(i, { uom: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <input
                        placeholder={t("rfq.details.field.notes")}
                        className={fieldClass}
                        value={li.notes}
                        onChange={(e) => updateLine(i, { notes: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        className="p-2 text-zinc-400 hover:text-red-600"
                        onClick={() => removeLine(i)}
                        aria-label={t("rfq.details.removeLine")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
              <Detail label={t("rfq.details.field.ref")} value={rfq.externalRef} mono />
              <Detail label={t("rfq.details.field.state")} value={rfq.state.replace(/_/g, " ")} />
              <Detail label={t("rfq.details.field.category")} value={rfq.productCategory || "—"} />
              <Detail label={t("rfq.details.field.targetMarket")} value={rfq.targetMarket || "—"} />
              <Detail label={t("rfq.details.field.incoterm")} value={rfq.incoterm} />
              <Detail label={t("rfq.details.field.currency")} value={rfq.currency ?? "—"} />
              <Detail label={t("rfq.details.field.deadline")}
                value={rfq.deadlineAt ? new Date(rfq.deadlineAt).toLocaleString() : "—"}
              />
              {!hideBuyerFields && (
                <Detail label={t("rfq.details.field.owner")} value={rfq.ownerName || "—"} />
              )}
              <Detail
                label={t("rfq.details.field.procurement")}
                value={rfq.procurementMethod?.replace(/_/g, " ") ?? "—"}
              />
              <Detail
                label={t("rfq.details.field.updated")}
                value={new Date(rfq.updatedAt).toLocaleString()}
              />
            </div>

            {!hideBuyerFields && <RfqCatalogIntakePanel rfq={rfq} />}

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                {t("rfq.details.field.description")}
              </div>
              <RfqDescriptionView description={rfq.productDescription} />
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                {t("rfq.details.lineItems")} ({rfq.lineItems?.length ?? 0})
              </div>
              {(rfq.lineItems?.length ?? 0) === 0 ? (
                <p className="text-sm text-zinc-500">{t("rfq.details.noLineItems")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-100">
                  <table className="w-full text-sm" data-testid="rfq-details-line-items">
                    <thead lang="en" className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="text-left px-3 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2">{t("rfq.details.field.lineDescription")}</th>
                        <th className="text-left px-3 py-2 w-20">{t("rfq.details.field.qty")}</th>
                        <th className="text-left px-3 py-2 w-16">UOM</th>
                        <th className="text-left px-3 py-2">{t("rfq.details.field.notes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfq.lineItems.map((li) => (
                        <tr key={li.id} className="border-t border-zinc-100">
                          <td className="px-3 py-2 text-zinc-500">{li.position}</td>
                          <td className="px-3 py-2 font-medium">{li.description}</td>
                          <td className="px-3 py-2">{li.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2">{li.uom}</td>
                          <td className="px-3 py-2 text-zinc-600">{li.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>

      {editing && (
        <CardFooter className="flex justify-end gap-2">
          <button
            type="button"
            className="dmx-btn-secondary text-sm inline-flex items-center gap-1.5"
            onClick={() => { setEditing(false); setForm(toForm(rfq)); }}
          >
            <X className="h-3.5 w-3.5" />
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-testid="rfq-details-save"
            disabled={saveMutation.isPending}
            className="dmx-btn-primary text-sm inline-flex items-center gap-1.5"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? t("common.saving") : t("rfq.details.save")}
          </button>
        </CardFooter>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-ink-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
