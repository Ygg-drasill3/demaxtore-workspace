import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminMixedContainerApi } from "../lib/mixed-container.api";
import { MC_STATE_LABELS } from "@dmx/contracts/mixed-container.zod";
import { Button } from "@/components/ui/Button";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AdminMixedContainerInboxPage() {
  const { data: kpis } = useQuery({ queryKey: ["mc-admin-kpis"], queryFn: () => adminMixedContainerApi.kpis() });
  const { data, isLoading } = useQuery({ queryKey: ["mc-admin-inbox"], queryFn: () => adminMixedContainerApi.inbox() });

  return (
    <div data-testid="mc-admin-inbox-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Operations · Mixed Container</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Container Request Inbox</h1>
        <p className="text-sm text-zinc-500 mt-1">Managed trade service — supplier sourcing performed offline by DeMaxtore procurement.</p>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="mc-admin-kpis">
          {[
            ["Pricing Requested", kpis.pricingRequested, "mc-kpi-pricing-requested"],
            ["Procurement In Progress", kpis.procurementInProgress, "mc-kpi-procurement"],
            ["Offer Ready", kpis.offerReady, "mc-kpi-offer-ready"],
            ["Awaiting Buyer Review", kpis.awaitingBuyerReview, "mc-kpi-buyer-review"],
            ["Allocations Pending", kpis.allocationsPending, "mc-kpi-allocations-pending"],
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
        <table className="w-full text-sm" data-testid="mc-admin-inbox-table">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">Reference</th>
              <th className="text-left p-3">Buyer</th>
              <th className="text-left p-3">Products</th>
              <th className="text-left p-3">Pallets</th>
              <th className="text-left p-3">Est. Value</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} data-testid={`mc-inbox-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="p-3 font-medium">{row.externalRef}</td>
                <td className="p-3">{row.buyerName}</td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">{row.currentPalletCount}</td>
                <td className="p-3">{fmtMoney(row.estValueMin)} – {fmtMoney(row.estValueMax)}</td>
                <td className="p-3">{MC_STATE_LABELS[row.state] ?? row.state}</td>
                <td className="p-3">{row.priority}</td>
                <td className="p-3">
                  <Link to={`/admin/mixed-container/${row.id}`}>
                    <Button size="sm" variant="secondary" data-testid={`mc-open-request-${row.externalRef}`}>Open</Button>
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
