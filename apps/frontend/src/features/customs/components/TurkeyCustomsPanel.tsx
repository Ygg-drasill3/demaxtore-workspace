import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customsApi } from "../lib/customs.api";
import { toast } from "@/store/toast.store";
import { useAuth } from "@/store/auth.store";

/** Shipment Workspace — shown only for Turkey-eligible imports. */
export function TurkeyCustomsPanel({ shipmentWorkspaceId }: { shipmentWorkspaceId: string }) {
  const qc = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const customsCasePath =
    role === "CUSTOMS_BROKER" || role === "TRUCKER" || role === "ADMIN" || role === "SUPER_ADMIN"
      ? "/partner/customs"
      : "/buyer/customs";
  const { data: eligibility, isLoading } = useQuery({
    queryKey: ["customs", "eligibility", shipmentWorkspaceId],
    queryFn: () => customsApi.eligibility(shipmentWorkspaceId),
  });

  const { data: detail } = useQuery({
    queryKey: ["customs", "shipment", shipmentWorkspaceId],
    queryFn: () => customsApi.byShipment(shipmentWorkspaceId),
    enabled: !!eligibility?.customsCaseId,
  });

  const ensure = useMutation({
    mutationFn: () => customsApi.ensure(shipmentWorkspaceId),
    onSuccess: (row) => {
      toast.success("Customs case ready");
      void qc.invalidateQueries({ queryKey: ["customs", "eligibility", shipmentWorkspaceId] });
      void qc.invalidateQueries({ queryKey: ["customs", "shipment", shipmentWorkspaceId] });
      void qc.invalidateQueries({ queryKey: ["customs", "case", row.id] });
    },
    onError: () => toast.error("Could not start customs clearance"),
  });

  if (isLoading) return null;
  if (!eligibility?.eligible) return null;

  const caseId = detail?.id ?? eligibility.customsCaseId;
  const readiness = detail?.readinessStatus ?? eligibility.readinessStatus ?? "—";
  const status = detail?.status ?? eligibility.status ?? "—";

  return (
    <section
      className="rounded-xl border border-paper-200 bg-white p-4 space-y-3"
      data-testid="turkey-customs-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Turkey Customs</p>
          <h2 className="text-lg font-semibold text-zinc-900">Customs clearance</h2>
          <p className="text-xs text-zinc-500">
            DeMaxtore customs brokerage — preparation and broker execution. Not an official government filing system.
          </p>
        </div>
        {caseId ? (
          <Link
            to={`${customsCasePath}/${caseId}`}
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm font-medium text-white"
            data-testid="open-customs-case"
          >
            Open customs
          </Link>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm font-medium text-white"
            disabled={ensure.isPending}
            onClick={() => ensure.mutate()}
            data-testid="request-customs-service"
          >
            Request DeMaxtore customs
          </button>
        )}
      </div>
      {String(status) === "CLEARED" && (
        <p className="text-xs text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2" data-testid="turkey-customs-cleared-note">
          Current lifecycle is CLEARED. Readiness is a preparation assessment and does not override clearance.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Customs status</dt>
          <dd className="font-medium" data-testid="turkey-customs-status">{String(status).replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Readiness (preparation)</dt>
          <dd className="font-medium" data-testid="turkey-customs-readiness">{String(readiness).replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Broker</dt>
          <dd className="font-medium">
            {detail?.brokerUserId
              ? String(status).includes("BROKER_REVIEW")
                ? "Under review"
                : "Assigned"
              : "Not assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Declaration</dt>
          <dd className="font-medium">
            {detail?.declarationReference
              ? "External declaration recorded"
              : detail?.status === "DECLARATION_PREPARING"
                ? "Preparing"
                : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Pre-arrival</dt>
          <dd className="font-medium">
            {(detail?.preArrival?.phase ?? "—").toString().replace(/_/g, " ")}
            {detail?.preArrival?.daysToArrival != null
              ? ` · ${detail.preArrival.daysToArrival}d`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Open actions</dt>
          <dd className="font-medium">
            {(detail?.readiness?.blockingCount ?? detail?.preArrival?.blockingCount ?? 0)}
          </dd>
        </div>
      </dl>

      {detail?.preArrival?.nextAction && (
        <p className="text-xs text-zinc-600">Next: {detail.preArrival.nextAction}</p>
      )}
    </section>
  );
}
