import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBcAllocationApi, adminBcExecutionApi } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.zod";

type BcContainerLine = { id: string; name: string; quantityMt: number; productRef: string };
type BcAllocRow = {
  id: string;
  allocationRef: string;
  lineId: string;
  productName: string;
  supplierCode: string;
  allocatedQuantityMt: number;
  allocationStatus: string;
};
type BcProformaRow = { id: string; allocationId: string; amount: number };
type BcPaymentRow = { id: string; allocationRef: string; amount: number; status: string };
type BcUnallocLine = { id: string; quantityMt: number; allocatedMt: number };

type BcAllocationWorkspace = {
  container: { externalRef: string; currency: string; lines: BcContainerLine[] };
  state: string;
  allocations: BcAllocRow[];
  proformas: BcProformaRow[];
  payments: BcPaymentRow[];
  unallocatedLines: BcUnallocLine[];
};

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function AllocationsInbox() {
  const { data: kpis } = useQuery({ queryKey: ["bc-allocation-kpis"], queryFn: () => adminBcAllocationApi.kpis() });
  const { data, isLoading } = useQuery({ queryKey: ["bc-allocation-inbox"], queryFn: () => adminBcAllocationApi.inbox() });

  return (
    <div data-testid="bc-allocations-inbox-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Operations · Bulk Container</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Supplier Allocation Workspace</h1>
        <p className="text-sm text-zinc-500 mt-1">Assign suppliers, collect proformas, and track payments after offer approval.</p>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="bc-allocation-kpis">
          {[
            ["Allocations Pending", kpis.allocationsPending, "bc-kpi-allocations-pending"],
            ["Proformas Pending", kpis.proformasPending, "bc-kpi-proformas-pending"],
            ["Payments Pending", kpis.paymentsPending, "bc-kpi-payments-pending"],
            ["Payments Confirmed", kpis.paymentsConfirmed, "bc-kpi-payments-confirmed"],
            ["Execution Ready", kpis.executionReady, "bc-kpi-execution-ready"],
          ].map(([label, val, tid]) => (
            <div key={tid as string} data-testid={tid as string} className="dmx-card p-4">
              <p className="text-xs uppercase text-zinc-500">{label as string}</p>
              <p className="text-2xl font-display font-semibold mt-1">{val as number}</p>
            </div>
          ))}
        </div>
      )}

      <div className="dmx-card overflow-x-auto">
        {isLoading && <div className="p-8 animate-pulse h-40" />}
        <table className="w-full text-sm" data-testid="bc-allocation-inbox-table">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">Reference</th>
              <th className="text-left p-3">Buyer</th>
              <th className="text-left p-3">Products</th>
              <th className="text-left p-3">Allocations</th>
              <th className="text-left p-3">Proformas</th>
              <th className="text-left p-3">Payments OK</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} data-testid={`bc-allocation-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="p-3 font-medium">{row.externalRef}</td>
                <td className="p-3">{row.buyerName}</td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">{row.allocationCount}</td>
                <td className="p-3">{row.proformaCount}</td>
                <td className="p-3">{row.paymentConfirmedCount}</td>
                <td className="p-3">{BC_STATE_LABELS[row.state as keyof typeof BC_STATE_LABELS] ?? row.state}</td>
                <td className="p-3">
                  <Link to={`/admin/bulk-container/allocations/${row.id}`}>
                    <Button size="sm" variant="secondary" data-testid={`bc-open-allocation-${row.externalRef}`}>Open</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllocationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [supplierCode, setSupplierCode] = useState("SUP-001");
  const [proformaNumber, setProformaNumber] = useState("PF-BC-001");

  const { data, isLoading } = useQuery({
    queryKey: ["bc-allocation-workspace", id],
    queryFn: () => adminBcAllocationApi.get(id!) as Promise<BcAllocationWorkspace>,
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["bc-allocation-workspace", id] });

  if (isLoading || !data) {
    return <div data-testid="bc-allocation-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const { container, allocations, proformas, payments, unallocatedLines, state } = data;

  const createAllocation = async (lineId: string, quantityMt: number) => {
    await adminBcAllocationApi.createAllocation(id!, {
      lineId,
      supplierCode,
      allocatedQuantityMt: quantityMt,
    });
    await refresh();
  };

  const uploadProforma = async (allocationId: string, amount: number) => {
    await adminBcAllocationApi.uploadProforma(id!, allocationId, {
      proformaNumber,
      proformaFileUrl: "https://example.com/bulk-proforma.pdf",
      amount,
      currency: container.currency,
    });
    await refresh();
  };

  return (
    <div data-testid="bc-allocation-workspace-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/admin/bulk-container/allocations" className="text-xs text-zinc-500 hover:underline">← Allocation Inbox</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Allocations · {container.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">Status: {BC_STATE_LABELS[state as keyof typeof BC_STATE_LABELS] ?? state}</p>
      </header>

      {state === "BC_EXECUTION_READY" && (
        <div data-testid="bc-execution-ready-banner" className="dmx-card p-5 bg-green-50 border-green-200 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-medium text-green-900">Execution Ready</h2>
            <p className="text-sm text-green-800 mt-1">All allocations, proformas, and payments confirmed. Spawn supplier orders into Trade OS.</p>
          </div>
          <Button data-testid="bc-spawn-execution-orders" onClick={() => void adminBcExecutionApi.spawnOrders(id!).then(refresh)}>
            Spawn Execution Orders
          </Button>
        </div>
      )}

      {state === "BC_EXECUTION_ACTIVE" && (
        <div data-testid="bc-execution-active-banner" className="dmx-card p-5 bg-blue-50 border-blue-200">
          <h2 className="font-medium text-blue-900">Execution Active</h2>
          <p className="text-sm text-blue-800 mt-1">Supplier orders spawned. Standard Order → FreightIQ → Shipment workflows are in progress.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-zinc-500">
          Supplier code
          <input className="block border rounded px-2 h-9 text-sm mt-1" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} data-testid="bc-allocation-supplier-code" />
        </label>
        <label className="text-xs text-zinc-500">
          Proforma #
          <input className="block border rounded px-2 h-9 text-sm mt-1" value={proformaNumber} onChange={(e) => setProformaNumber(e.target.value)} data-testid="bc-proforma-number" />
        </label>
        {["BC_APPROVED", "BC_ALLOCATION_IN_PROGRESS"].includes(state) && unallocatedLines.length > 0 && (
          <Button data-testid="bc-complete-allocations" variant="secondary" onClick={() => void adminBcAllocationApi.completeAllocations(id!).then(refresh)}>
            Complete Allocations
          </Button>
        )}
      </div>

      <section className="dmx-card p-5" data-testid="bc-allocation-lines">
        <h2 className="font-medium mb-4">Product Lines</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">MT</th>
              <th className="text-left pb-2">Allocated</th>
              <th className="text-left pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {container.lines.map((line: BcContainerLine) => {
              const unalloc = unallocatedLines.find((u) => u.id === line.id);
              const alloc = allocations.find((a) => a.lineId === line.id);
              const remainingMt = unalloc ? unalloc.quantityMt - unalloc.allocatedMt : 0;
              return (
                <tr key={line.id} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{line.name}</td>
                  <td className="py-3">{line.quantityMt}</td>
                  <td className="py-3">{alloc ? alloc.allocationRef : "Unallocated"}</td>
                  <td className="py-3">
                    {remainingMt > 0 && (
                      <Button size="sm" data-testid={`bc-create-allocation-${line.productRef}`} onClick={() => void createAllocation(line.id, remainingMt)}>
                        Assign Supplier ({remainingMt} MT)
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {allocations.length > 0 && (
        <section className="dmx-card p-5" data-testid="bc-allocation-list">
          <h2 className="font-medium mb-4">Supplier Allocations (ops only)</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Ref</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Supplier</th>
                <th className="text-left pb-2">MT</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Proforma</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const hasProforma = proformas.some((p) => p.allocationId === a.id);
                const proforma = proformas.find((p) => p.allocationId === a.id);
                const amount = proforma?.amount ?? a.allocatedQuantityMt * 350;
                return (
                  <tr key={a.id} data-testid={`bc-allocation-${a.allocationRef}`} className="border-t border-zinc-100">
                    <td className="py-3">{a.allocationRef}</td>
                    <td className="py-3">{a.productName}</td>
                    <td className="py-3">{a.supplierCode}</td>
                    <td className="py-3">{a.allocatedQuantityMt}</td>
                    <td className="py-3">{a.allocationStatus}</td>
                    <td className="py-3">
                      {!hasProforma && (
                        <Button size="sm" data-testid={`bc-upload-proforma-${a.allocationRef}`} onClick={() => void uploadProforma(a.id, amount)}>
                          Upload Proforma
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {payments.length > 0 && (
        <section className="dmx-card p-5" data-testid="bc-payment-list">
          <h2 className="font-medium mb-4">Payment Tracking</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Allocation</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} data-testid={`bc-payment-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{fmtMoney(p.amount)}</td>
                  <td className="py-3" data-testid={`bc-payment-status-${p.allocationRef}`}>{p.status}</td>
                  <td className="py-3">
                    {p.status === "PAYMENT_PENDING" && (
                      <Button size="sm" data-testid={`bc-confirm-payment-${p.allocationRef}`} onClick={() => void adminBcAllocationApi.confirmPayment(id!, p.id).then(refresh)}>
                        Confirm Payment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function AdminBulkContainerAllocationsPage() {
  const { id } = useParams<{ id: string }>();
  if (id) return <AllocationWorkspace />;
  return <AllocationsInbox />;
}
