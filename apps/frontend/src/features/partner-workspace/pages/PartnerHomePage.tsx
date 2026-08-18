import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "../lib/partner.api";
import { useAuth } from "@/store/auth.store";
import { MyCustomsCasesQueue } from "../components/MyCustomsCasesQueue";
import { MyDeliveriesQueue } from "../components/MyDeliveriesQueue";

export default function PartnerHomePage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["partner", "home"],
    queryFn: partnerApi.home,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="partner-home">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Partner Workspace</p>
        <h1 className="text-2xl font-semibold">My Work</h1>
        <p className="text-sm text-zinc-600">
          {user?.displayName} · {data?.partnerRole?.replace(/_/g, " ") ?? user?.role}
        </p>
      </header>

      {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
      {isError && (
        <div>
          <p className="text-sm text-red-600">Failed to load partner home.</p>
          <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {data && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="partner-action-kpis">
            <Kpi label="Tasks due today" value={data.tasksDueToday} />
            <Kpi label="Open tasks" value={data.openTasks} />
            <Kpi label="Missing documents" value={data.missingDocuments} />
            <Kpi label="Shipment updates" value={data.shipmentUpdates} />
          </section>

          {data.customsCases !== undefined && (
            <MyCustomsCasesQueue cases={data.customsCases} showViewAll />
          )}

          {data.inlandDeliveries !== undefined && (
            <MyDeliveriesQueue deliveries={data.inlandDeliveries} showViewAll />
          )}

          <section className="space-y-2" data-testid="partner-action-required">
            <h2 className="text-lg font-medium">Action required</h2>
            {data.actionRequired.length === 0 ? (
              <p className="text-sm text-zinc-500">No open actions.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.actionRequired.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-zinc-500">
                        {a.kind}
                        {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Link
                      className="underline"
                      to={`/partner/transactions/${a.workspaceId}`}
                      data-testid={`partner-action-${a.id}`}
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2" data-testid="partner-transactions">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">My transactions</h2>
              <Link className="text-sm underline" to="/partner/transactions">View all</Link>
            </div>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-zinc-500">No assigned transactions yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.transactions.slice(0, 8).map((t) => (
                  <li key={t.workspaceId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{t.externalRef}</p>
                      <p className="text-xs text-zinc-500">
                        {t.workspaceType} · {t.state} · {t.openTaskCount} open task(s)
                      </p>
                    </div>
                    <Link className="underline" to={`/partner/transactions/${t.workspaceId}`}>Open</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
