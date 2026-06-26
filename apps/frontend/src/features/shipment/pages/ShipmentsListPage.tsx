import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink, Ship } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchBuyerShipmentListPaged } from "@/features/navigation/lib/buyer-portfolio";
import { fetchSupplierShipmentListPaged } from "@/features/navigation/lib/supplier-portfolio";
import { ListPagination } from "@/features/navigation/components/ListPagination";

const PAGE_SIZE = 25;

export default function ShipmentsListPage() {
  const isSupplier = useLocation().pathname.startsWith("/supplier");
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [isSupplier ? "supplier" : "buyer", "shipment-list", offset],
    queryFn: () => (isSupplier ? fetchSupplierShipmentListPaged : fetchBuyerShipmentListPaged)({ limit: PAGE_SIZE, offset }),
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div data-testid="shipments-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Execution</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Shipments</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Active shipments spawned from orders — tracking and delivery status.
        </p>
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Could not load shipments.</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          testId="shipments-list-empty"
          icon={<Ship className="h-5 w-5" />}
          title="No shipments yet"
          body={
            isSupplier
              ? "Shipments are created when freight is booked on an order linked to your POs. Production and booking updates will appear here."
              : "Shipments appear after you select a freight offer on an order. Complete RFQ award and freight selection to track execution."
          }
          action={
            <Link to={isSupplier ? "/supplier/purchase-orders" : "/buyer/purchase-orders"} className="dmx-btn-secondary text-sm">
              View purchase orders
            </Link>
          }
        />
      ) : (
      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Shipment ref</th>
              <th className="text-left px-4 py-3">State</th>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Created</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">Loading…</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} data-testid={`shipments-list-row-${r.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.externalRef}</td>
                <td className="px-4 py-3">{r.state}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.orderRef}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/workspace/shipment/${r.id}`}
                    data-testid={`shipment-open-${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline"
                  >
                    Open shipment <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ListPagination
          offset={offset}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setOffset}
          testId="shipments-list-pagination"
        />
      </div>
      )}
    </div>
  );
}
