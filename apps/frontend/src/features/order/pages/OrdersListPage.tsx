import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { useOrderList } from "../hooks/useOrderList";
import { OrderStateBadge } from "../components/OrderStateBadge";
import type { ListOrderQuery } from "@dmx/contracts/order.zod";

const BUCKET_FILTERS: Array<{ value: ListOrderQuery["bucket"]; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export default function OrdersListPage() {
  const user = useAuth((s) => s.user);
  const [bucket, setBucket] = useState<ListOrderQuery["bucket"]>("active");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ListOrderQuery["sort"]>("newest");

  const { data, isLoading } = useOrderList({ bucket, q: q || undefined, sort });
  const rows = data?.items ?? [];

  const roleLabel =
    user?.role === "SUPPLIER" ? "Assigned orders" :
    user?.role === "ADMIN" ? "All orders" : "My orders";

  return (
    <div data-testid="orders-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">{roleLabel}</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Orders</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track purchase orders through production, freight, and delivery.
        </p>
      </header>

      <div className="dmx-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="orders-list-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order ref, contract, or PO…"
            className="h-10 w-full pl-9 pr-3 rounded-md border border-zinc-200 text-sm"
          />
        </div>
        <select
          data-testid="orders-list-bucket-filter"
          value={bucket}
          onChange={(e) => setBucket(e.target.value as ListOrderQuery["bucket"])}
          className="h-10 px-3 rounded-md border border-zinc-200 text-sm"
        >
          {BUCKET_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          data-testid="orders-list-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as ListOrderQuery["sort"])}
          className="h-10 px-3 rounded-md border border-zinc-200 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="activity">Last activity</option>
        </select>
      </div>

      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Order ref</th>
              <th className="text-left px-4 py-3">Buyer</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-left px-4 py-3">State</th>
              <th className="text-left px-4 py-3">Created</th>
              <th className="text-left px-4 py-3">Shipments</th>
              <th className="text-left px-4 py-3">PO ref</th>
              <th className="text-left px-4 py-3">Last activity</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} data-testid="orders-list-empty" className="px-4 py-12 text-center text-zinc-500">
                  No orders found. Orders appear here after a PO is issued on an RFQ or CommodityBid.
                </td>
              </tr>
            ) : rows.map((r: {
              id: string; externalRef: string; buyerName: string; supplierName: string;
              state: string; createdAt: string; shipmentCount: number; poReference: string | null;
              lastActivityAt: string;
            }) => (
              <tr key={r.id} data-testid={`orders-list-row-${r.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.externalRef}</td>
                <td className="px-4 py-3 text-zinc-700">{r.buyerName || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">{r.supplierName || "—"}</td>
                <td className="px-4 py-3"><OrderStateBadge state={r.state} /></td>
                <td className="px-4 py-3 text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-zinc-600 tabular-nums">{r.shipmentCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-600">{r.poReference ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(r.lastActivityAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/workspace/order/${r.id}`}
                    data-testid={`orders-open-${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline"
                  >
                    Open order
                    <ExternalLink className="h-3.5 w-3.5" />
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
