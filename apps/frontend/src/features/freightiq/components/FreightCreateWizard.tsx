import { useState } from "react";
import type { FreightMode } from "@dmx/contracts/freightiq";
import { ChevronRight, ChevronLeft, Ship, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FreightCreateForm {
  mode: FreightMode;
  pol: string;
  pod: string;
  cargoDescription: string;
  containerType: string;
  readyDate: string;
}

interface Props {
  initial: FreightCreateForm;
  onSubmit: (form: FreightCreateForm) => void;
  onCancel: () => void;
  busy?: boolean;
}

const STEPS = [
  { key: "route", label: "Route & mode", icon: Ship },
  { key: "cargo", label: "Cargo readiness", icon: Package },
  { key: "review", label: "Review", icon: CheckCircle2 },
] as const;

export function FreightCreateWizard({ initial, onSubmit, onCancel, busy }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);

  const canNext = step === 0
    ? form.pol.trim() && form.pod.trim()
    : step === 1
      ? form.cargoDescription.trim().length >= 3
      : true;

  return (
    <div data-testid="freightiq-create-wizard" className="border-b border-paper-200 bg-paper-50/60">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-paper-100">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
              i < step ? "bg-emerald-600 text-white" : i === step ? "bg-accent-900 text-white" : "bg-paper-200 text-zinc-500",
            )}>
              {i + 1}
            </span>
            <span className={cn("text-xs font-medium", i === step ? "text-ink-900" : "text-zinc-500")}>{s.label}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-300 mx-1" />}
          </div>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-600">
              Port of loading (POL)
              <input className="dmx-input mt-1" value={form.pol} onChange={(e) => setForm((f) => ({ ...f, pol: e.target.value }))} />
            </label>
            <label className="block text-xs text-zinc-600">
              Port of discharge (POD)
              <input className="dmx-input mt-1" value={form.pod} onChange={(e) => setForm((f) => ({ ...f, pod: e.target.value }))} />
            </label>
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              Freight mode
              <select className="dmx-input mt-1" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as FreightMode }))}>
                <option value="OCEAN_FCL">Ocean FCL</option>
                <option value="OCEAN_LCL">Ocean LCL</option>
                <option value="AIR">Air</option>
                <option value="ROAD">Road</option>
                <option value="RAIL">Rail</option>
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-600 sm:col-span-2">
              Cargo description
              <textarea className="dmx-input mt-1 min-h-[80px]" value={form.cargoDescription} onChange={(e) => setForm((f) => ({ ...f, cargoDescription: e.target.value }))} />
            </label>
            <label className="block text-xs text-zinc-600">
              Container type
              <input className="dmx-input mt-1" value={form.containerType} onChange={(e) => setForm((f) => ({ ...f, containerType: e.target.value }))} />
            </label>
            <label className="block text-xs text-zinc-600">
              Cargo ready date
              <input type="date" className="dmx-input mt-1" value={form.readyDate} onChange={(e) => setForm((f) => ({ ...f, readyDate: e.target.value }))} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="dmx-card p-4 space-y-2 text-sm">
            <p className="text-zinc-600">DeMaxtore operations will contact qualified forwarders for your route. Offers will appear in this workspace.</p>
            <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-paper-100">
              <dt className="text-zinc-500">Route</dt><dd className="font-medium">{form.pol} → {form.pod}</dd>
              <dt className="text-zinc-500">Mode</dt><dd>{form.mode.replace(/_/g, " ")}</dd>
              <dt className="text-zinc-500">Cargo</dt><dd className="col-span-1">{form.cargoDescription}</dd>
              <dt className="text-zinc-500">Container</dt><dd>{form.containerType || "—"}</dd>
            </dl>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <button type="button" className="dmx-btn-secondary text-sm inline-flex items-center gap-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="dmx-btn-primary text-sm ml-auto" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ChevronRight className="h-4 w-4 inline" />
            </button>
          ) : (
            <button type="button" className="dmx-btn-primary text-sm ml-auto" disabled={busy} onClick={() => onSubmit(form)}>
              Submit freight quote request
            </button>
          )}
          <button type="button" className="dmx-btn-secondary text-sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
