import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Ship, Trash2, Plus } from "lucide-react";
import { freightiqApi } from "../lib/freightiq.api";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";

export default function ShippersPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", scacCode: "", country: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["freight-shippers", q],
    queryFn: () => freightiqApi.listShippers(q || undefined),
  });

  const create = useMutation({
    mutationFn: () => freightiqApi.createShipper({
      name: form.name.trim(),
      scacCode: form.scacCode.trim() || undefined,
      country: form.country.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["freight-shippers"] });
      setForm({ name: "", scacCode: "", country: "", notes: "" });
      toast.success(t("freightiq.shippers.created"));
    },
    onError: () => toast.error(t("freightiq.shippers.createFailed")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => freightiqApi.deleteShipper(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["freight-shippers"] });
      toast.success(t("freightiq.shippers.deleted"));
    },
    onError: () => toast.error(t("freightiq.shippers.deleteFailed")),
  });

  const canCreate = form.name.trim().length >= 2;

  return (
    <div data-testid="shippers-page" className="max-w-[900px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("freightiq.shippers.eyebrow")}</span>
          <h1 className="font-display text-3xl font-semibold mt-1">{t("freightiq.shippers.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t("freightiq.shippers.subtitle")}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/operations/forwarders" className="text-accent-900 hover:underline">
            {t("freightiq.intake.manageForwarders")} →
          </Link>
          <Link to="/admin/freightiq" className="text-accent-900 hover:underline">
            {t("freightiq.intake.title")} →
          </Link>
        </div>
      </header>

      <section className="dmx-card p-5" data-testid="shipper-create">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-accent-900" />
          {t("freightiq.shippers.addTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs text-zinc-600 sm:col-span-2">
            {t("freightiq.shippers.name")} *
            <input
              data-testid="shipper-name"
              className="dmx-input mt-1"
              placeholder="Yang Ming Line"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-xs text-zinc-600">
            SCAC
            <input
              data-testid="shipper-scac"
              className="dmx-input mt-1"
              placeholder="YMLU"
              value={form.scacCode}
              onChange={(e) => setForm({ ...form, scacCode: e.target.value })}
            />
          </label>
          <label className="block text-xs text-zinc-600">
            {t("freightiq.shippers.country")}
            <input
              data-testid="shipper-country"
              className="dmx-input mt-1"
              placeholder="TW"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </label>
          <label className="block text-xs text-zinc-600 sm:col-span-2">
            {t("freightiq.shippers.notes")}
            <textarea
              className="dmx-input mt-1 min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <button
          type="button"
          data-testid="shipper-create-submit"
          className="dmx-btn-primary text-sm mt-4"
          disabled={!canCreate || create.isPending}
          onClick={() => create.mutate()}
        >
          {t("freightiq.shippers.addButton")}
        </button>
      </section>

      <section className="dmx-card overflow-hidden">
        <div className="p-4 border-b border-paper-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="shipper-search"
              className="dmx-input pl-9 text-sm w-full"
              placeholder={t("freightiq.shippers.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <ul data-testid="shipper-list" className="divide-y divide-paper-100">
            {(data?.items ?? []).map((s) => (
              <li
                key={s.id}
                data-testid={`shipper-row-${s.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-50/80"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-800 grid place-items-center shrink-0">
                    <Ship className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {[s.scacCode, s.country].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {s.notes && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{s.notes}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid={`shipper-delete-${s.id}`}
                  className="shrink-0 h-9 w-9 rounded-lg border border-paper-200 text-zinc-500 hover:text-red-700 hover:border-red-200 grid place-items-center"
                  title={t("freightiq.shippers.delete")}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(t("freightiq.shippers.deleteConfirm").replace("{name}", s.name))) {
                      remove.mutate(s.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {!data?.items?.length && (
              <li className="p-6 text-center text-sm text-zinc-500">{t("freightiq.shippers.empty")}</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
