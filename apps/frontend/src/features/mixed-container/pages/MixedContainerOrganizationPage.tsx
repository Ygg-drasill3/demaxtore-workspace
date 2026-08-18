import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { OrganizationWorkspaceView } from "../components/OrganizationWorkspaceView";

export default function MixedContainerOrganizationPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mc-organization", id],
    queryFn: () => mixedContainerApi.organization(id!),
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

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
    <div data-testid="mc-organization-page" data-guide="mc-organization" className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <Link to="/buyer/mixed-container/requests" className="text-xs text-zinc-500 hover:underline">← My Containers</Link>
      <OrganizationWorkspaceView data={data} />
    </div>
  );
}
