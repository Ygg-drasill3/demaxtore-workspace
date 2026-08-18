import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "../lib/partner.api";

export default function PartnerTransactionsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["partner", "transactions"],
    queryFn: partnerApi.listTransactions,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6" data-testid="partner-transactions-page">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Partner Workspace</p>
        <h1 className="text-2xl font-semibold">Transactions</h1>
      </header>
      {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
      {isError && (
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
      )}
      {data && (
        <ul className="divide-y rounded-lg border">
          {data.items.map((t) => (
            <li key={t.workspaceId} className="flex items-center justify-between px-3 py-3 text-sm">
              <div>
                <p className="font-medium">{t.externalRef}</p>
                <p className="text-xs text-zinc-500">{t.workspaceType} · {t.state}</p>
              </div>
              <Link className="underline" to={`/partner/transactions/${t.workspaceId}`}>Open</Link>
            </li>
          ))}
          {data.items.length === 0 && (
            <li className="px-3 py-4 text-sm text-zinc-500">No assigned transactions.</li>
          )}
        </ul>
      )}
    </div>
  );
}
