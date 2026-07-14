import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, History, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { toast } from "@/store/toast.store";
import { referenceFreightAdminApi } from "../lib/reference-freight.api";
import {
  CSV_TEMPLATE,
  currentYearMonth,
  lifecycleBadgeClass,
  lifecycleLabel,
  monthBoundsIso,
} from "../lib/reference-freight.ui";
import type { ReferenceFreightRateDto } from "@dmx/contracts/reference-freight";

function fmtMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

type FormState = {
  originPort: string;
  destinationPort: string;
  containerType: string;
  referenceFreight: string;
  currency: string;
  validMonth: string;
};

const EMPTY_FORM: FormState = {
  originPort: "",
  destinationPort: "",
  containerType: "20GP",
  referenceFreight: "",
  currency: "USD",
  validMonth: currentYearMonth(),
};

export default function AdminReferenceFreightRatesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    originPort: "",
    destinationPort: "",
    containerType: "",
    lifecycle: "" as "" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "INACTIVE",
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<ReferenceFreightRateDto | null>(null);
  const [auditRateId, setAuditRateId] = useState<string | null>(null);
  const [csvText, setCsvText] = useState(CSV_TEMPLATE);
  const [showImport, setShowImport] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 20,
      ...(filters.originPort ? { originPort: filters.originPort } : {}),
      ...(filters.destinationPort ? { destinationPort: filters.destinationPort } : {}),
      ...(filters.containerType ? { containerType: filters.containerType } : {}),
      ...(filters.lifecycle ? { lifecycle: filters.lifecycle } : {}),
    }),
    [page, filters],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reference-freight-rates", queryParams],
    queryFn: () => referenceFreightAdminApi.list(queryParams),
  });

  const { data: audits, isLoading: auditsLoading } = useQuery({
    queryKey: ["admin-reference-freight-audits", auditRateId],
    queryFn: () => referenceFreightAdminApi.audits(auditRateId!),
    enabled: !!auditRateId,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-reference-freight-rates"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const bounds = monthBoundsIso(form.validMonth);
      const payload = {
        originPort: form.originPort,
        destinationPort: form.destinationPort,
        containerType: form.containerType,
        referenceFreight: Number(form.referenceFreight),
        currency: form.currency,
        validFrom: bounds.validFrom,
        validUntil: bounds.validUntil,
      };
      if (editing) return referenceFreightAdminApi.update(editing.id, payload);
      return referenceFreightAdminApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Reference rate updated" : "Reference rate created");
      setForm(EMPTY_FORM);
      setEditing(null);
      invalidate();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        "Could not save reference rate";
      toast.error(message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => referenceFreightAdminApi.deactivate(id),
    onSuccess: () => {
      toast.success("Reference rate deactivated");
      invalidate();
    },
    onError: () => toast.error("Could not deactivate rate"),
  });

  const copyMonthMutation = useMutation({
    mutationFn: () => referenceFreightAdminApi.copyMonth({ targetMonth: currentYearMonth() }),
    onSuccess: (result) => {
      toast.success(`Copied ${result.copied} rates (${result.skipped} skipped)`);
      invalidate();
    },
    onError: () => toast.error("Could not copy previous month"),
  });

  const importMutation = useMutation({
    mutationFn: () => referenceFreightAdminApi.importCsv(csvText),
    onSuccess: (result) => {
      toast.success(`Imported ${result.created} rates (${result.skipped} skipped)`);
      if (result.errors.length) toast.error(`${result.errors.length} rows failed`);
      setShowImport(false);
      invalidate();
    },
    onError: () => toast.error("CSV import failed"),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const startEdit = (row: ReferenceFreightRateDto) => {
    setEditing(row);
    setForm({
      originPort: row.originPort,
      destinationPort: row.destinationPort,
      containerType: row.containerType,
      referenceFreight: String(row.referenceFreight),
      currency: row.currency,
      validMonth: row.validFrom.slice(0, 7),
    });
  };

  return (
    <div data-testid="reference-freight-admin-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <span className="dmx-eyebrow text-zinc-500">Operations · Reference Freight</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Reference Freight Rates</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Monthly reference navlun verileri — Estimated CIF hesaplamasında kullanılır. Nihai navlun FreightIQ ile kesinleşir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            data-testid="reference-freight-copy-month"
            onClick={() => void copyMonthMutation.mutate()}
            disabled={copyMonthMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            Copy previous month
          </Button>
          <Button variant="secondary" data-testid="reference-freight-import-toggle" onClick={() => setShowImport((v) => !v)}>
            <Upload className="h-4 w-4 mr-1.5" />
            CSV import
          </Button>
        </div>
      </header>

      {showImport && (
        <section className="dmx-card p-5 space-y-3" data-testid="reference-freight-import-panel">
          <h2 className="font-medium">Import CSV</h2>
          <p className="text-xs text-zinc-500">Columns: originPort, destinationPort, containerType, referenceFreight, currency, validFrom, validUntil</p>
          <textarea
            className="w-full min-h-[140px] font-mono text-xs border border-zinc-200 rounded-lg p-3"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            data-testid="reference-freight-csv-input"
          />
          <Button data-testid="reference-freight-import-submit" onClick={() => void importMutation.mutate()} disabled={importMutation.isPending}>
            Run import
          </Button>
        </section>
      )}

      <section className="dmx-card p-5 space-y-4" data-testid="reference-freight-form">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">{editing ? "Edit reference rate" : "Add reference rate"}</h2>
          {editing && (
            <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}>
              Cancel edit
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Field label="Origin port">
            <Input value={form.originPort} onChange={(e) => setForm({ ...form, originPort: e.target.value })} data-testid="rf-origin" placeholder="Mersin / TRMER" />
          </Field>
          <Field label="Destination port">
            <Input value={form.destinationPort} onChange={(e) => setForm({ ...form, destinationPort: e.target.value })} data-testid="rf-destination" placeholder="Lagos / NGLOS" />
          </Field>
          <Field label="Container">
            <Select value={form.containerType} onChange={(e) => setForm({ ...form, containerType: e.target.value })} data-testid="rf-container">
              {["20GP", "40GP", "40HC", "LCL"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Reference freight (USD)">
            <Input type="number" value={form.referenceFreight} onChange={(e) => setForm({ ...form, referenceFreight: e.target.value })} data-testid="rf-freight" />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} data-testid="rf-currency" maxLength={3} />
          </Field>
          <Field label="Validity month">
            <Input type="month" value={form.validMonth} onChange={(e) => setForm({ ...form, validMonth: e.target.value })} data-testid="rf-valid-month" />
          </Field>
        </div>
        <Button
          data-testid="rf-save"
          onClick={() => void saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.originPort || !form.destinationPort || !form.referenceFreight}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {editing ? "Save changes" : "Create rate"}
        </Button>
      </section>

      <section className="dmx-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="reference-freight-filters">
          <Input placeholder="Filter origin" value={filters.originPort} onChange={(e) => { setPage(1); setFilters({ ...filters, originPort: e.target.value }); }} data-testid="rf-filter-origin" />
          <Input placeholder="Filter destination" value={filters.destinationPort} onChange={(e) => { setPage(1); setFilters({ ...filters, destinationPort: e.target.value }); }} data-testid="rf-filter-destination" />
          <Select value={filters.containerType} onChange={(e) => { setPage(1); setFilters({ ...filters, containerType: e.target.value }); }} data-testid="rf-filter-container">
            <option value="">All containers</option>
            {["20GP", "40GP", "40HC", "LCL"].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filters.lifecycle} onChange={(e) => { setPage(1); setFilters({ ...filters, lifecycle: e.target.value as typeof filters.lifecycle }); }} data-testid="rf-filter-lifecycle">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring soon (7d)</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        {isLoading && <div className="p-8 animate-pulse h-40" />}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="reference-freight-table">
            <thead className="text-xs uppercase text-zinc-500 bg-paper-50">
              <tr>
                <th className="text-left p-3">Lane</th>
                <th className="text-left p-3">Container</th>
                <th className="text-left p-3">Freight</th>
                <th className="text-left p-3">Validity</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <tr key={row.id} className="border-t border-zinc-100" data-testid={`reference-freight-row-${row.id}`}>
                  <td className="p-3">
                    <div className="font-medium">{row.originPort} → {row.destinationPort}</div>
                  </td>
                  <td className="p-3">{row.containerType}</td>
                  <td className="p-3 tabular-nums">{fmtMoney(row.referenceFreight, row.currency)}</td>
                  <td className="p-3 text-xs text-zinc-600">
                    {fmtDate(row.validFrom)} – {fmtDate(row.validUntil)}
                  </td>
                  <td className="p-3">
                    <span
                      data-testid={`reference-freight-status-${row.id}`}
                      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${lifecycleBadgeClass(row.lifecycleStatus)}`}
                    >
                      {lifecycleLabel(row.lifecycleStatus)}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button variant="secondary" size="sm" data-testid={`reference-freight-audit-${row.id}`} onClick={() => setAuditRateId(row.id)}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    {row.status === "ACTIVE" && row.lifecycleStatus !== "EXPIRED" && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => startEdit(row)} data-testid={`reference-freight-edit-${row.id}`}>Edit</Button>
                        <Button variant="secondary" size="sm" onClick={() => void deactivateMutation.mutate(row.id)} data-testid={`reference-freight-deactivate-${row.id}`}>Deactivate</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-600" data-testid="reference-freight-pagination">
          <span>{data?.total ?? 0} total · page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="rf-page-prev">Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="rf-page-next">Next</Button>
          </div>
        </div>
      </section>

      {auditRateId && (
        <section className="dmx-card p-5 space-y-3" data-testid="reference-freight-audit-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Audit history</h2>
            <Button variant="secondary" size="sm" onClick={() => setAuditRateId(null)}>Close</Button>
          </div>
          {auditsLoading && <div className="animate-pulse h-20" />}
          <ul className="space-y-2 text-sm">
            {(audits ?? []).map((a) => (
              <li key={a.id} className="border border-zinc-100 rounded-lg p-3" data-testid={`reference-freight-audit-entry-${a.id}`}>
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-xs text-zinc-500">{fmtDate(a.createdAt)}</span>
                </div>
                <pre className="mt-2 text-[10px] text-zinc-500 overflow-x-auto">{JSON.stringify(a.snapshot, null, 2)}</pre>
              </li>
            ))}
            {!auditsLoading && (audits ?? []).length === 0 && (
              <li className="text-zinc-500">No audit entries yet.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
