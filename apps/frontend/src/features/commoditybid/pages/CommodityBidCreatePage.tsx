import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateCommodityBidDraftInput } from "@dmx/contracts/commoditybid.zod";
import { useNavigate } from "react-router-dom";
import { commoditybidApi } from "../lib/commoditybid.api";
import { api } from "@/lib/api";
import { toast } from "@/store/toast.store";

export default function CommodityBidCreatePage() {
  const nav = useNavigate();
  const [suppliers, setSuppliers] = useState<Array<{ id: string; email: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const defaultStart = new Date(Date.now() + 3600_000).toISOString().slice(0, 16);

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(CreateCommodityBidDraftInput),
    defaultValues: {
      title: "", description: "", currency: "USD" as const,
      auctionStartsAt: defaultStart,
      auctionDurationMinutes: 30 as const,
      invitationDeadlineMinutes: 60,
      supplierUserIds: [] as string[],
      lots: [{ commodity: "", quantity: 1, uom: "MT" }],
    },
  });

  useEffect(() => {
    void api.get("/commoditybid/suppliers?limit=20").then((r) => {
      const rows = (r.data as Array<{ id: string; email: string }>).filter((s) => s.email.includes("supplier"));
      setSuppliers(rows);
      setSelected(rows.slice(0, 2).map((s) => s.id));
    });
  }, []);

  useEffect(() => {
    setValue("supplierUserIds", selected, { shouldValidate: true });
  }, [selected, setValue]);

  const submit = handleSubmit(
    async (v) => {
      if (!selected.length) {
        toast.error("Select at least one supplier");
        return;
      }
      try {
        const dto = await commoditybidApi.createDraft({ ...v, supplierUserIds: selected });
        toast.success("Auction scheduled");
        nav(`/workspace/commoditybid/${dto.id}`);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: { message?: string } } } };
        toast.error(err.response?.data?.error?.message ?? "Failed to create auction");
      }
    },
    () => toast.error("Please complete all required fields."),
  );

  return (
    <form data-testid="cb-create-form" onSubmit={submit} className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-4xl font-semibold">Create CommodityBid Auction</h1>
      <p className="text-sm text-zinc-600">
        Schedule a reverse auction. Suppliers compete live; the lowest valid bid wins automatically.
      </p>
      <section className="dmx-card p-6 space-y-4">
        <input data-testid="cb-title" {...register("title")} placeholder="Title" className="h-11 w-full px-3 rounded-lg border" />
        <textarea data-testid="cb-description" rows={4} {...register("description")} placeholder="Description" className="w-full px-3 rounded-lg border" />
        <select data-testid="cb-currency" {...register("currency")} className="h-11 w-full px-3 rounded-lg border">
          {["USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <div>
          <label className="text-xs text-zinc-500">Auction start (UTC)</label>
          <input data-testid="cb-auction-start" type="datetime-local" {...register("auctionStartsAt")} className="h-11 w-full px-3 rounded-lg border mt-1" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Duration</label>
          <select data-testid="cb-auction-duration" {...register("auctionDurationMinutes", { valueAsNumber: true })} className="h-11 w-full px-3 rounded-lg border mt-1">
            <option value={1}>1 minute</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </div>
        <input data-testid="cb-lot-commodity" {...register("lots.0.commodity")} placeholder="Commodity" className="h-11 w-full px-3 rounded-lg border" />
        <input data-testid="cb-lot-qty" type="number" {...register("lots.0.quantity", { valueAsNumber: true })} className="h-11 w-full px-3 rounded-lg border" />
        <input data-testid="cb-lot-uom" {...register("lots.0.uom")} placeholder="UOM" className="h-11 w-full px-3 rounded-lg border" />
        <div data-testid="cb-supplier-picker" className="space-y-2">
          <p className="text-sm font-medium">Invite suppliers</p>
          {suppliers.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
              />
              {s.email}
            </label>
          ))}
        </div>
        <button data-testid="cb-submit" type="submit" disabled={isSubmitting} className="dmx-btn-primary">Schedule Auction</button>
      </section>
    </form>
  );
}
