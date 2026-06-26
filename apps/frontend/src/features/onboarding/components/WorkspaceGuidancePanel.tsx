import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWorkspaceGuidance } from "../hooks";

interface WorkspaceGuidancePanelProps {
  workspaceType: string;
  workspaceId: string;
}

/** What Happens Next — delegates to backend next-action engines. */
export function WorkspaceGuidancePanel({ workspaceType, workspaceId }: WorkspaceGuidancePanelProps) {
  const { data, isLoading } = useWorkspaceGuidance(workspaceType, workspaceId);

  if (isLoading) {
    return <div data-testid="workspace-guidance-loading" className="dmx-card p-4 animate-pulse h-24" />;
  }

  if (!data) return null;

  return (
    <section
      data-testid="workspace-guidance-panel"
      className="rounded-xl border border-paper-200 bg-paper-50 p-4"
    >
      <div className="dmx-eyebrow text-zinc-500">{data.title}</div>
      <p data-testid="workspace-guidance-next" className="text-sm font-medium text-ink-900 mt-2">
        Next: {data.nextLabel}
      </p>
      <p className="text-sm text-zinc-600 mt-1">{data.nextDescription}</p>
      {data.actionLabel && data.actionHref && (
        <Link to={data.actionHref} className="inline-block mt-3">
          <Button size="sm" variant="secondary" data-testid="workspace-guidance-cta">
            {data.actionLabel} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      )}
    </section>
  );
}
