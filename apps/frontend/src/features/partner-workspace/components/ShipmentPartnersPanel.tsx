import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PartnerAssignmentDto, PartnerRole } from "@dmx/contracts/partner-workspace";
import { partnerApi } from "../lib/partner.api";
import { canManagePartnerAssignments } from "../lib/can-manage-partner-assignments";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";

type AssignableRole = Extract<PartnerRole, "CUSTOMS_BROKER" | "TRUCKER">;

function RoleAssignBlock({
  shipmentWorkspaceId,
  role,
  title,
  label,
  testIdPrefix,
  current,
  assignmentsLoading,
  assignmentsError,
}: {
  shipmentWorkspaceId: string;
  role: AssignableRole;
  title: string;
  label: string;
  testIdPrefix: string;
  current: PartnerAssignmentDto | null;
  assignmentsLoading: boolean;
  assignmentsError: boolean;
}) {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");

  const {
    data: candidates,
    isLoading: candidatesLoading,
    isError: candidatesError,
  } = useQuery({
    queryKey: ["partner", "assignable", role],
    queryFn: () => partnerApi.listAssignable(role),
  });

  const assign = useMutation({
    mutationFn: () =>
      partnerApi.assign({
        workspaceId: shipmentWorkspaceId,
        userId: selectedUserId,
        partnerRole: role,
      }),
    onSuccess: () => {
      toast.success(`${label} assigned`);
      setSelectedUserId("");
      void qc.invalidateQueries({ queryKey: ["partner", "assignments", shipmentWorkspaceId] });
      void qc.invalidateQueries({ queryKey: ["customs"] });
      void qc.invalidateQueries({ queryKey: ["inland"] });
    },
    onError: () => toast.error(`Could not assign ${label.toLowerCase()}`),
  });

  const revoke = useMutation({
    mutationFn: () => partnerApi.revoke(current!.id),
    onSuccess: () => {
      toast.success(`${label} assignment revoked`);
      void qc.invalidateQueries({ queryKey: ["partner", "assignments", shipmentWorkspaceId] });
      void qc.invalidateQueries({ queryKey: ["customs"] });
      void qc.invalidateQueries({ queryKey: ["inland"] });
      void qc.invalidateQueries({ queryKey: ["partner", "home"] });
    },
    onError: () => toast.error(`Could not revoke ${label.toLowerCase()}`),
  });

  return (
    <div
      className="rounded-lg border border-paper-200 bg-paper-50/60 p-3 space-y-2"
      data-testid={`${testIdPrefix}-block`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500" data-testid={`${testIdPrefix}-current`}>
            {assignmentsLoading
              ? "Loading…"
              : assignmentsError
                ? "Could not load assignment"
                : current
                  ? `Assigned: ${current.displayName} (${current.email})`
                  : "Not assigned"}
          </p>
        </div>
        {current ? (
          <div className="flex items-center gap-2">
            <span
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              data-testid={`${testIdPrefix}-status`}
            >
              Assigned
            </span>
            <button
              type="button"
              className="rounded-lg border border-paper-300 bg-white px-2 py-1 text-xs text-zinc-700 disabled:opacity-50"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate()}
              data-testid={`${testIdPrefix}-revoke`}
            >
              {revoke.isPending ? "Revoking…" : "Revoke"}
            </button>
          </div>
        ) : (
          <span
            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
            data-testid={`${testIdPrefix}-status`}
          >
            Unassigned
          </span>
        )}
      </div>

      {candidatesLoading ? (
        <p className="text-xs text-zinc-500">Loading {label.toLowerCase()} list…</p>
      ) : candidatesError ? (
        <p className="text-xs text-red-600" data-testid={`${testIdPrefix}-error`}>
          Could not load {label.toLowerCase()} candidates
        </p>
      ) : !candidates?.items.length ? (
        <p className="text-xs text-zinc-500" data-testid={`${testIdPrefix}-empty`}>
          No {label.toLowerCase()} users available
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="w-full rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            data-testid={`${testIdPrefix}-select`}
            aria-label={`Select ${label}`}
          >
            <option value="">Select {label.toLowerCase()}…</option>
            {candidates.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} — {u.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!selectedUserId || assign.isPending}
            onClick={() => assign.mutate()}
            data-testid={`${testIdPrefix}-assign`}
          >
            {assign.isPending ? "Assigning…" : current ? `Reassign ${label}` : `Assign ${label}`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Admin/Ops-only partner assignment for shipment workspace (broker + trucker). */
export function ShipmentPartnersPanel({ shipmentWorkspaceId }: { shipmentWorkspaceId: string }) {
  const role = useAuth((s) => s.user?.role);
  const canManage = canManagePartnerAssignments(role);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useQuery({
    queryKey: ["partner", "assignments", shipmentWorkspaceId],
    queryFn: () => partnerApi.listAssignments(shipmentWorkspaceId),
    enabled: canManage,
  });

  if (!canManage) return null;

  const broker = assignments?.items.find((a) => a.partnerRole === "CUSTOMS_BROKER") ?? null;
  const trucker = assignments?.items.find((a) => a.partnerRole === "TRUCKER") ?? null;

  return (
    <section
      className="rounded-xl border border-paper-200 bg-white p-4 space-y-3"
      data-testid="shipment-partners-panel"
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Partners</p>
        <h2 className="text-lg font-semibold text-zinc-900">Partner assignments</h2>
        <p className="text-xs text-zinc-500">
          Assign Customs Broker and Trucker via existing partner assignment workflow.
        </p>
      </div>

      <RoleAssignBlock
        shipmentWorkspaceId={shipmentWorkspaceId}
        role="CUSTOMS_BROKER"
        title="Customs Broker"
        label="Broker"
        testIdPrefix="assign-broker"
        current={broker}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
      />
      <RoleAssignBlock
        shipmentWorkspaceId={shipmentWorkspaceId}
        role="TRUCKER"
        title="Trucker / Inland Partner"
        label="Trucker"
        testIdPrefix="assign-trucker"
        current={trucker}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
      />
    </section>
  );
}
