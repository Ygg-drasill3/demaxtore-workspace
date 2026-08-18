import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMixedContainerApi } from "../lib/mixed-container.api";
import { OrganizationWorkspaceView } from "../components/OrganizationWorkspaceView";
import { toast } from "@/store/toast.store";

export default function AdminMixedContainerOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mc-admin-organization", id],
    queryFn: () => adminMixedContainerApi.getOrganization(id!),
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

  const { data: managers } = useQuery({
    queryKey: ["mc-procurement-managers"],
    queryFn: () => adminMixedContainerApi.procurementManagers(),
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["mc-admin-organization", id] });

  if (isLoading) {
    return <div data-testid="mc-organization-loading" className="p-8 animate-pulse">Loading…</div>;
  }
  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load organization workspace.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="mc-admin-organization-page" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <Link to="/admin/mixed-container" className="text-xs text-zinc-500 hover:underline">← Procurement Queue</Link>
      <OrganizationWorkspaceView
        data={data}
        isAdmin
        managers={managers?.items ?? []}
        submitting={submitting}
        onUpdateStatus={async (status, note) => {
          setSubmitting(true);
          try {
            await adminMixedContainerApi.updateOrganizationStatus(id!, { status, note });
            toast.success("Organization status updated");
            refresh();
          } catch {
            toast.error("Could not update status");
          } finally {
            setSubmitting(false);
          }
        }}
        onAssignManager={async (managerId) => {
          setSubmitting(true);
          try {
            await adminMixedContainerApi.assignOperationsManager(id!, managerId);
            toast.success("Operations manager assigned");
            refresh();
          } catch {
            toast.error("Could not assign manager");
          } finally {
            setSubmitting(false);
          }
        }}
        onAddInternalNote={async (body) => {
          setSubmitting(true);
          try {
            await adminMixedContainerApi.addOrganizationInternalNote(id!, body);
            toast.success("Internal note added");
            refresh();
          } catch {
            toast.error("Could not add note");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
