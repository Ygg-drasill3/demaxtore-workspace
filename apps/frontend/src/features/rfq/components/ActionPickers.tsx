// apps/frontend/src/features/rfq/components/ActionPickers.tsx
//
// Modal pickers for RFQ actions that need structured payloads before calling applyTransition.
//
//   • assign_suppliers  (buyer)  → multi-select supplier user IDs
//   • select_supplier   (buyer)  → pick quotation + rationale
//   • submit_proforma   (supplier) → upload proforma file
//   • issue_po          (buyer)  → auto-generated PO or manual PDF upload
//
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { rfqApi, rfqAttachmentUrl } from "../lib/rfq.api";
import { supplierCompanyLabel } from "../lib/suppliers.normalize";
import { productSectionTitle } from "../lib/quotations-by-product";
import { EstimatedCifPoGateSummary } from "@/features/freight-estimate/components/EstimatedCifPanel";

export const PICKER_ACTIONS = new Set<string>([
  "assign_suppliers",
  "select_supplier",
  "submit_proforma",
  "issue_po",
]);

export interface PickerProps {
  workspaceId?: string;
  open:        boolean;
  onClose:     () => void;
  onConfirm:   (payload: Record<string, unknown>) => void;
  isPending?:  boolean;
}

// ─── Assign suppliers ─────────────────────────────────────────────────────────

export function AssignSuppliersPicker({ workspaceId, open, onClose, onConfirm, isPending }: PickerProps) {
  const [search, setSearch] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [lineBySupplier, setLineBySupplier] = useState<Record<string, string[]>>({});
  useEffect(() => { if (!open) { setIds([]); setSearch(""); setLineBySupplier({}); } }, [open]);

  const rfq = useQuery({
    queryKey: ["rfq", workspaceId, "assign-picker-lines"],
    queryFn: () => rfqApi.get(workspaceId!),
    enabled: open && !!workspaceId,
  });
  const lineItems = rfq.data?.lineItems ?? [];
  const multiProduct = lineItems.length > 1;

  const list = useQuery({
    queryKey: ["admin-suppliers", search],
    queryFn: () => rfqApi.lookupSuppliers(search),
    enabled: open,
  });

  const toggleSupplier = (id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) {
        setLineBySupplier((lbs) => {
          const next = { ...lbs };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      if (lineItems.length === 1) {
        setLineBySupplier((lbs) => ({ ...lbs, [id]: [lineItems[0]!.id] }));
      }
      return [...prev, id];
    });
  };

  const toggleLine = (supplierId: string, lineId: string) => {
    setLineBySupplier((prev) => {
      const current = prev[supplierId] ?? [];
      const next = current.includes(lineId)
        ? current.filter((x) => x !== lineId)
        : [...current, lineId];
      return { ...prev, [supplierId]: next };
    });
  };

  const canConfirm =
    ids.length > 0 &&
    (!multiProduct || ids.every((sid) => (lineBySupplier[sid]?.length ?? 0) > 0));

  const confirm = () => {
    if (multiProduct) {
      onConfirm({
        assignments: ids.map((supplierUserId) => ({
          supplierUserId,
          rfqLineItemIds: lineBySupplier[supplierUserId] ?? [],
        })),
      });
      return;
    }
    onConfirm({ supplierUserIds: ids });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign suppliers"
      description={
        multiProduct
          ? "Select suppliers and which products each may quote on."
          : "Select suppliers to invite to this RFQ."
      }
      size="md"
      testId="assign-suppliers-picker"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="assign-suppliers-confirm"
            variant="primary"
            disabled={!canConfirm || isPending}
            loading={isPending}
            onClick={confirm}
          >
            Assign ({ids.length})
          </Button>
        </>
      }
    >
      <Input
        data-testid="assign-suppliers-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search suppliers…"
        className="mb-3"
      />
      <div className="max-h-64 overflow-y-auto dmx-thin-scroll space-y-1">
        {(list.data ?? []).map((s) => {
          const selected = ids.includes(s.id);
          return (
            <div key={s.id} className="space-y-1">
              <button
                type="button"
                data-testid={`supplier-option-${s.id}`}
                onClick={() => toggleSupplier(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm border ${
                  selected ? "border-accent-900/30 bg-accent-50" : "border-transparent hover:bg-zinc-50"
                }`}
              >
                <div className="font-medium">{supplierCompanyLabel(s)}</div>
                <div className="text-xs text-zinc-500">
                  {s.organisation?.trim() ? (
                    <>{s.displayName} · {s.email}</>
                  ) : (
                    s.email
                  )}
                </div>
              </button>
              {selected && multiProduct && (
                <div
                  className="ml-2 mr-1 mb-2 rounded-lg border border-paper-200 bg-paper-50/80 p-2 space-y-1"
                  data-testid={`supplier-products-${s.id}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                    Products to quote
                  </p>
                  {lineItems.map((li) => {
                    const checked = (lineBySupplier[s.id] ?? []).includes(li.id);
                    return (
                      <label
                        key={li.id}
                        className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-white cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleLine(s.id, li.id)}
                        />
                        <span className="text-ink-900 leading-snug">{productSectionTitle(li.description)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {list.isLoading && <div className="text-xs text-zinc-500 px-2">Loading…</div>}
      </div>
    </Modal>
  );
}

// ─── Select supplier ─────────────────────────────────────────────────────────

export function SelectSupplierPicker({ workspaceId, open, onClose, onConfirm, isPending }: PickerProps) {
  const [quotationId, setQuotationId] = useState("");
  const [rationale, setRationale]     = useState("");
  useEffect(() => { if (!open) { setQuotationId(""); setRationale(""); } }, [open]);

  const list = useQuery({
    queryKey: ["rfq-quotations", workspaceId],
    queryFn: () => rfqApi.quotations(workspaceId!),
    enabled: open && !!workspaceId,
  });

  const rows = list.data ?? [];
  const selected = rows.find((q) => q.id === quotationId);
  const canConfirm = quotationId && rationale.trim().length >= 15;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select supplier"
      description="Choose the winning quotation and explain your decision."
      size="lg"
      testId="select-supplier-picker"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="select-supplier-confirm"
            variant="primary"
            disabled={!canConfirm || isPending}
            loading={isPending}
            onClick={() => onConfirm({
              supplierUserId: selected?.supplierId,
              quotationId,
              rationale: rationale.trim(),
            })}
          >
            Select supplier
          </Button>
        </>
      }
    >
      <div className="max-h-56 overflow-y-auto dmx-thin-scroll space-y-2">
        {rows.map((q) => (
          <button
            key={q.id}
            type="button"
            data-testid={`quotation-option-${q.id}`}
            onClick={() => setQuotationId(q.id)}
            className={`w-full text-left flex gap-3 p-3 rounded-lg border ${
              quotationId === q.id ? "border-accent-900/40 bg-accent-50/50" : "border-zinc-100 hover:bg-zinc-50/50"
            }`}
          >
            <span className="flex-1 min-w-0">
              <div className="font-medium text-sm">{q.supplierName}</div>
              <div className="text-sm text-zinc-700">
                <span className="font-mono tabular-nums">
                  {Number(q.total).toLocaleString()} {q.currency}
                </span>
              </div>
              <div className="text-xs text-zinc-500">
                {q.incoterm ?? "—"}
                {q.leadTimeDays != null && ` · ${q.leadTimeDays} day lead`}
                {q.sampleAvail != null && ` · Sample ${q.sampleAvail ? "yes" : "no"}`}
              </div>
            </span>
          </button>
        ))}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <div className="px-3 py-4 text-xs text-zinc-500">No quotations submitted yet.</div>
        )}
      </div>
      <Textarea
        data-testid="select-supplier-rationale"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Min. 15 characters — why this supplier?"
        rows={3}
        className="mt-3"
      />
    </Modal>
  );
}

// ─── Issue PO (auto-generated or buyer-uploaded document) ────────────────────

type IssuePoMode = "auto" | "manual";

export function IssuePoPicker({ workspaceId, open, onClose, onConfirm, isPending }: PickerProps) {
  const [mode, setMode] = useState<IssuePoMode>("auto");
  const [poFileUrl, setPoFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("auto");
      setPoFileUrl(null);
      setUploading(false);
    }
  }, [open]);

  const attachments = useQuery({
    queryKey: ["rfq", workspaceId, "attachments"],
    queryFn: () => rfqApi.attach(workspaceId!) as Promise<RfqAttachmentRow[]>,
    enabled: open && !!workspaceId && mode === "manual",
  });

  const pdfAttachments = useMemo(
    () => (attachments.data ?? []).filter((a) => (a.mimeType ?? "").includes("pdf") || a.fileName.endsWith(".pdf")),
    [attachments.data],
  );

  async function uploadFile(file: File) {
    if (!workspaceId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ id: string }>(`/rfq/${workspaceId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPoFileUrl(rfqAttachmentUrl(workspaceId, data.id));
    } finally {
      setUploading(false);
    }
  }

  const estimate = useQuery({
    queryKey: ["freight-estimate-panel", workspaceId],
    queryFn: () => import("@/features/freight-estimate/lib/freight-estimate.api").then((m) => m.freightEstimateApi.panel(workspaceId!)),
    enabled: open && !!workspaceId,
  });

  const canConfirm = (mode === "auto" || !!poFileUrl) && !!estimate.data?.current;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sipariş emri (PO) oluştur"
      description="Sistem otomatik PO üretebilir veya kendi PO belgenizi yükleyebilirsiniz. Onay sonrası sipariş çalışma alanı açılır."
      size="md"
      testId="issue-po-picker"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <Button
            data-testid="issue-po-confirm"
            variant="primary"
            disabled={!canConfirm || isPending || uploading}
            loading={isPending}
            onClick={() =>
              onConfirm({
                mode,
                ...(mode === "manual" ? { poFileUrl: poFileUrl! } : {}),
              })
            }
          >
            PO yayınla
          </Button>
        </>
      }
    >
      <EstimatedCifPoGateSummary tradeId={workspaceId} />
      <div className="flex gap-2 mb-4 mt-4">
        <button
          type="button"
          data-testid="issue-po-mode-auto"
          onClick={() => setMode("auto")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm text-left ${
            mode === "auto" ? "border-accent-900/30 bg-accent-50 text-accent-900" : "border-zinc-100 hover:bg-zinc-50"
          }`}
        >
          <span className="font-medium block">Otomatik</span>
          <span className="text-xs text-zinc-500">Sistem PO numarası ve belgesi üretir</span>
        </button>
        <button
          type="button"
          data-testid="issue-po-mode-manual"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm text-left ${
            mode === "manual" ? "border-accent-900/30 bg-accent-50 text-accent-900" : "border-zinc-100 hover:bg-zinc-50"
          }`}
        >
          <span className="font-medium block">Manuel yükleme</span>
          <span className="text-xs text-zinc-500">PO numarası sistemden; sadece PDF yükleyin</span>
        </button>
      </div>

      {mode === "auto" ? (
        <p className="text-sm text-zinc-600">
          Onayladığınızda benzersiz bir PO numarası atanır ve sistem standart PO belgesini oluşturur.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            PO numarası otomatik atanır. Sadece kendi PO PDF belgenizi yükleyin.
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) void uploadFile(f);
            }}
            className={`rounded-xl border border-dashed p-6 text-center text-sm transition-colors ${
              dragOver ? "border-accent-900/30 bg-accent-50 text-accent-900" : "border-paper-200 text-zinc-500"
            }`}
          >
            <UploadCloud className="h-6 w-6 mx-auto mb-2 text-accent-900" />
            <p>PO PDF dosyasını sürükleyin veya</p>
            <label className="mt-2 inline-block">
              <span className="text-accent-900 font-medium cursor-pointer hover:underline">dosya seçin</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                data-testid="issue-po-file-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
              />
            </label>
            {uploading && <p className="text-xs mt-2 text-zinc-500">Yükleniyor…</p>}
            {poFileUrl && <p className="text-xs mt-2 text-emerald-700">Belge hazır</p>}
          </div>

          {pdfAttachments.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Veya mevcut ek dosyayı kullanın</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pdfAttachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    data-testid={`issue-po-pick-${a.id}`}
                    onClick={() => workspaceId && setPoFileUrl(rfqAttachmentUrl(workspaceId, a.id))}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm border ${
                      poFileUrl?.includes(a.id) ? "border-accent-900/30 bg-accent-50" : "border-zinc-100 hover:bg-zinc-50"
                    }`}
                  >
                    {a.fileName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Submit proforma (supplier file upload) ───────────────────────────────────

interface RfqAttachmentRow {
  id: string;
  fileName: string;
  mimeType?: string;
}

export function SubmitProformaPicker({ workspaceId, open, onClose, onConfirm, isPending }: PickerProps) {
  const [proformaFileUrl, setProformaFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setProformaFileUrl(null);
      setUploading(false);
    }
  }, [open]);

  const attachments = useQuery({
    queryKey: ["rfq", workspaceId, "attachments"],
    queryFn: () => rfqApi.attach(workspaceId!) as Promise<RfqAttachmentRow[]>,
    enabled: open && !!workspaceId,
  });

  const pdfAttachments = useMemo(
    () => (attachments.data ?? []).filter((a) => (a.mimeType ?? "").includes("pdf") || a.fileName.endsWith(".pdf")),
    [attachments.data],
  );

  async function uploadFile(file: File) {
    if (!workspaceId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ id: string }>(`/rfq/${workspaceId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProformaFileUrl(rfqAttachmentUrl(workspaceId, data.id));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit proforma"
      description="Upload or select a proforma invoice PDF."
      size="md"
      testId="submit-proforma-picker"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="submit-proforma-confirm"
            variant="primary"
            disabled={!proformaFileUrl || isPending || uploading}
            loading={isPending}
            onClick={() => onConfirm({ proformaFileUrl: proformaFileUrl! })}
          >
            Submit proforma
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void uploadFile(f);
        }}
        className={`rounded-xl border border-dashed p-6 text-center text-sm transition-colors ${
          dragOver ? "border-accent-900/30 bg-accent-50 text-accent-900" : "border-paper-200 text-zinc-500"
        }`}
      >
        <UploadCloud className="h-6 w-6 mx-auto mb-2 text-accent-900" />
        <p>Drag a PDF here or</p>
        <label className="mt-2 inline-block">
          <span className="text-accent-900 font-medium cursor-pointer hover:underline">browse</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            data-testid="proforma-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
        </label>
        {uploading && <p className="text-xs mt-2 text-zinc-500">Uploading…</p>}
        {proformaFileUrl && <p className="text-xs mt-2 text-emerald-700">File ready</p>}
      </div>

      {pdfAttachments.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Or use existing attachment</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pdfAttachments.map((a) => (
              <button
                key={a.id}
                type="button"
                data-testid={`proforma-pick-${a.id}`}
                onClick={() => workspaceId && setProformaFileUrl(rfqAttachmentUrl(workspaceId, a.id))}
                className={`w-full text-left px-3 py-2 rounded-md text-sm border ${
                  proformaFileUrl?.includes(a.id) ? "border-accent-900/30 bg-accent-50" : "border-zinc-100 hover:bg-zinc-50"
                }`}
              >
                {a.fileName}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
