import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { freightiqApi } from "../lib/freightiq.api";

export default function ForwardersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    country: "",
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["forwarders", q],
    queryFn: () => freightiqApi.listForwarders(q || undefined),
  });

  const create = useMutation({
    mutationFn: () => freightiqApi.createForwarder(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["forwarders"] });
      setForm({ companyName: "", contactName: "", email: "", phone: "", country: "", notes: "" });
    },
  });

  if (isLoading) return <div data-testid="forwarders-loading">Loading…</div>;

  return (
    <div data-testid="forwarders-page" className="max-w-[900px] mx-auto space-y-6 p-4">
      <header>
        <h1 className="font-display text-3xl font-semibold">Forwarder directory</h1>
        <p className="text-sm text-zinc-500">External forwarders — no portal or login</p>
      </header>

      <section className="dmx-card p-4" data-testid="forwarder-create">
        <h2 className="text-sm font-medium mb-3">Create forwarder</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input data-testid="forwarder-company" placeholder="Company" className="border rounded px-2 h-8"
            value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <input data-testid="forwarder-contact" placeholder="Contact name" className="border rounded px-2 h-8"
            value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input data-testid="forwarder-email" placeholder="Email" className="border rounded px-2 h-8 col-span-2"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" className="border rounded px-2 h-8"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Country" className="border rounded px-2 h-8"
            value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <button
          type="button"
          data-testid="forwarder-create-submit"
          className="mt-3 h-9 px-3 rounded bg-blue-900 text-white text-xs"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          Create forwarder
        </button>
      </section>

      <section className="dmx-card p-4">
        <input
          data-testid="forwarder-search"
          className="border rounded px-2 h-8 text-xs w-full mb-3"
          placeholder="Search forwarders…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul data-testid="forwarder-list" className="text-xs space-y-2">
          {(data?.items ?? []).map((f) => (
            <li key={f.id} data-testid={`forwarder-row-${f.id}`} className="border-t pt-2">
              <strong>{f.companyName}</strong> · {f.contactName} · {f.email}
              {!f.active && <span className="text-red-600 ml-2">inactive</span>}
            </li>
          ))}
          {!data?.items?.length && <li className="text-zinc-500">No forwarders</li>}
        </ul>
      </section>
    </div>
  );
}
