import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMcAllocationApi, adminMcExecutionApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { MC_STATE_LABELS } from "@dmx/contracts/mixed-container.zod";
import type { McAllocationWorkspaceDTO } from "@dmx/contracts/mixed-container.zod";

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function AllocationsInbox() {
  const { data: kpis } = useQuery({ queryKey: ["mc-allocation-kpis"], queryFn: () => adminMcAllocationApi.kpis() });
  const { data, isLoading } = useQuery({ queryKey: ["mc-allocation-inbox"], queryFn: () => adminMcAllocationApi.inbox() });

  return (
    <div data-testid="mc-allocations-inbox-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Operations · Mixed Container</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Supplier Allocation Workspace</h1>
        <p className="text-sm text-zinc-500 mt-1">Assign products to suppliers after offer approval — operations only.</p>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="mc-allocation-kpis">
          {[
            ["Allocations Pending", kpis.allocationsPending, "mc-kpi-allocations-pending"],
            ["Proformas Pending", kpis.proformasPending, "mc-kpi-proformas-pending"],
            ["Payments Pending", kpis.paymentsPending, "mc-kpi-payments-pending"],
            ["Payments Confirmed", kpis.paymentsConfirmed, "mc-kpi-payments-confirmed"],
            ["Execution Ready", kpis.executionReady, "mc-kpi-execution-ready"],
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
        <table className="w-full text-sm" data-testid="mc-allocation-inbox-table">
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
              <tr key={row.id} data-testid={`mc-allocation-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="p-3 font-medium">{row.externalRef}</td>
                <td className="p-3">{row.buyerName}</td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">{row.allocationCount}</td>
                <td className="p-3">{row.proformaCount}</td>
                <td className="p-3">{row.paymentConfirmedCount}</td>
                <td className="p-3">{MC_STATE_LABELS[row.state] ?? row.state}</td>
                <td className="p-3">
                  <Link to={`/admin/mixed-container/allocations/${row.id}`}>
                    <Button size="sm" variant="secondary" data-testid={`mc-open-allocation-${row.externalRef}`}>Open</Button>
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
  const [exwPrice, setExwPrice] = useState("1000");
  const [proformaNumber] = useState("PF-001");

  const { data, isLoading } = useQuery({
    queryKey: ["mc-allocation-workspace", id],
    queryFn: () => adminMcAllocationApi.get(id!),
    enabled: !!id,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc-allocation-workspace", id] });

  if (isLoading || !data) {
    return <div data-testid="mc-allocation-loading" className="p-8 animate-pulse">Loading…</div>;
  }

  const ws = data as McAllocationWorkspaceDTO;
  const { container, allocations, proformas, payments, unallocatedLineIds } = ws;

  const createAllocation = async (lineId: string) => {
    const line = container.lines.find((l) => l.id === lineId);
    if (!line) return;
    await adminMcAllocationApi.createAllocation(id!, {
      containerLineId: lineId,
      supplierCode,
      allocatedPallets: line.palletCount,
      expectedExwPrice: Number(exwPrice),
    });
    await refresh();
  };

  const uploadProforma = async (allocationId: string, amount: number) => {
    const now = new Date();
    const due = new Date(now.getTime() + 14 * 86400000);
    await adminMcAllocationApi.uploadProforma(id!, allocationId, {
      proformaNumber,
      issueDate: now.toISOString(),
      dueDate: due.toISOString(),
      currency: container.currency,
      amount,
      documentUrl: "https://example.com/proforma.pdf",
    });
    await refresh();
  };

  return (
    <div data-testid="mc-allocation-workspace-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/admin/mixed-container/allocations" className="text-xs text-zinc-500 hover:underline">← Allocation Inbox</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Allocations · {container.externalRef}</h1>
        <p className="text-sm text-zinc-500 mt-1">Status: {MC_STATE_LABELS[container.state] ?? container.state}</p>
      </header>

      {container.state === "MC_EXECUTION_READY" && (
        <div data-testid="mc-execution-ready-banner" className="dmx-card p-5 bg-green-50 border-green-200 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-medium text-green-900">Execution Ready</h2>
            <p className="text-sm text-green-800 mt-1">All allocations, proformas, and payments confirmed. Spawn supplier orders into Trade OS.</p>
          </div>
          <Button data-testid="mc-spawn-execution-orders" onClick={() => void adminMcExecutionApi.spawnOrders(id!).then(refresh)}>
            Spawn Execution Orders
          </Button>
        </div>
      )}

      {container.state === "MC_EXECUTION_ACTIVE" && (
        <div data-testid="mc-execution-active-banner" className="dmx-card p-5 bg-blue-50 border-blue-200">
          <h2 className="font-medium text-blue-900">Execution Active</h2>
          <p className="text-sm text-blue-800 mt-1">Supplier orders spawned. Standard Order → FreightIQ → Shipment workflows are now in progress.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-zinc-500">
          Supplier code
          <input className="block border rounded px-2 h-9 text-sm mt-1" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} data-testid="mc-allocation-supplier-code" />
        </label>
        <label className="text-xs text-zinc-500">
          EXW price
          <input className="block border rounded px-2 h-9 text-sm mt-1 w-28" value={exwPrice} onChange={(e) => setExwPrice(e.target.value)} data-testid="mc-allocation-exw-price" />
        </label>
        {["MC_APPROVED", "MC_ALLOCATION_IN_PROGRESS"].includes(container.state) && unallocatedLineIds.length > 0 && (
          <Button data-testid="mc-complete-allocations" variant="secondary" onClick={() => void adminMcAllocationApi.completeAllocations(id!).then(refresh)}>
            Complete Allocations
          </Button>
        )}
      </div>

      <section className="dmx-card p-5" data-testid="mc-allocation-lines">
        <h2 className="font-medium mb-4">Product Lines</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left pb-2">Product</th>
              <th className="text-left pb-2">Pallets</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-left pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {container.lines.map((line) => {
              const alloc = allocations.find((a) => a.containerLineId === line.id);
              return (
                <tr key={line.id} className="border-t border-zinc-100">
                  <td className="py-3 font-medium">{line.name}</td>
                  <td className="py-3">{line.palletCount}</td>
                  <td className="py-3">{alloc ? alloc.allocationRef : "Unallocated"}</td>
                  <td className="py-3">
                    {!alloc && (
                      <Button size="sm" data-testid={`mc-create-allocation-${line.productRef}`} onClick={() => void createAllocation(line.id)}>
                        Assign Supplier
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
        <section className="dmx-card p-5" data-testid="mc-allocation-list">
          <h2 className="font-medium mb-4">Supplier Allocations (ops only)</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="text-left pb-2">Ref</th>
                <th className="text-left pb-2">Product</th>
                <th className="text-left pb-2">Supplier</th>
                <th className="text-left pb-2">Pallets</th>
                <th className="text-left pb-2">EXW</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-left pb-2">Proforma</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const hasProforma = proformas.some((p) => p.allocationId === a.id);
                return (
                  <tr key={a.id} data-testid={`mc-allocation-${a.allocationRef}`} className="border-t border-zinc-100">
                    <td className="py-3">{a.allocationRef}</td>
                    <td className="py-3">{a.productName}</td>
                    <td className="py-3">{a.supplierCode}</td>
                    <td className="py-3">{a.allocatedPallets}</td>
                    <td className="py-3">{fmtMoney(a.expectedExwPrice)}</td>
                    <td className="py-3">{a.status}</td>
                    <td className="py-3">
                      {!hasProforma && (
                        <Button size="sm" data-testid={`mc-upload-proforma-${a.allocationRef}`} onClick={() => void uploadProforma(a.id, a.expectedExwPrice * a.allocatedPallets)}>
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
        <section className="dmx-card p-5" data-testid="mc-payment-list">
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
                <tr key={p.id} data-testid={`mc-payment-${p.allocationRef}`} className="border-t border-zinc-100">
                  <td className="py-3">{p.allocationRef}</td>
                  <td className="py-3">{fmtMoney(p.amount)}</td>
                  <td className="py-3" data-testid={`mc-payment-status-${p.allocationRef}`}>{p.paymentStatus}</td>
                  <td className="py-3">
                    {p.paymentStatus === "PAYMENT_SENT" && (
                      <Button size="sm" data-testid={`mc-confirm-payment-${p.allocationRef}`} onClick={() => void adminMcAllocationApi.confirmPayment(id!, p.id).then(refresh)}>
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

export default function AdminMixedContainerAllocationsPage() {
  const { id } = useParams<{ id: string }>();
  if (id) return <AllocationWorkspace />;
  return <AllocationsInbox />;
}
