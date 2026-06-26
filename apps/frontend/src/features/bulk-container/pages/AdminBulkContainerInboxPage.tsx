import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminBulkContainerApi } from "../lib/bulk-container.api";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.zod";
import { Button } from "@/components/ui/Button";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AdminBulkContainerInboxPage() {
  const { data: kpis } = useQuery({ queryKey: ["bc-admin-kpis"], queryFn: () => adminBulkContainerApi.kpis() });
  const { data, isLoading } = useQuery({ queryKey: ["bc-admin-inbox"], queryFn: () => adminBulkContainerApi.inbox() });

  return (
    <div data-testid="bc-admin-inbox-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Operations · BulkContainer</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Bulk Procurement Inbox</h1>
        <p className="text-sm text-zinc-500 mt-1">Manual supplier sourcing — no supplier portal, no auctions.</p>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="bc-admin-kpis">
          {[
            ["Pricing Requested", kpis.pricingRequested, "bc-kpi-pricing-requested"],
            ["Procurement In Progress", kpis.procurementInProgress, "bc-kpi-procurement"],
            ["Offer Ready", kpis.offerReady, "bc-kpi-offer-ready"],
            ["Awaiting Buyer Review", kpis.awaitingBuyerReview, "bc-kpi-buyer-review"],
            ["Approved", kpis.approved, "bc-kpi-approved"],
            ["Expired", kpis.expired, "bc-kpi-expired"],
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
        <table className="w-full text-sm" data-testid="bc-admin-inbox-table">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">Reference</th>
              <th className="text-left p-3">Buyer</th>
              <th className="text-left p-3">Products</th>
              <th className="text-left p-3">MT</th>
              <th className="text-left p-3">Est. Value</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} data-testid={`bc-inbox-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="p-3 font-medium">{row.externalRef}</td>
                <td className="p-3">{row.buyerName}</td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">{row.currentWeightMt}</td>
                <td className="p-3">{fmtMoney(row.estValueMin)} – {fmtMoney(row.estValueMax)}</td>
                <td className="p-3">{BC_STATE_LABELS[row.state as keyof typeof BC_STATE_LABELS] ?? row.state}</td>
                <td className="p-3">
                  <Link to={`/admin/bulk-container/procurement/${row.id}`}>
                    <Button size="sm" variant="secondary" data-testid={`bc-open-request-${row.externalRef}`}>Open</Button>
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
