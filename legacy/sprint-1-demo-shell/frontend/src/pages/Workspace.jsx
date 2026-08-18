import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, FileText, ListTodo, Users } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { workspaceMockMeta } from "@/lib/mockData";

const TYPE_LABEL = {
  rfq: "RFQ",
  commoditybid: "CommodityBid",
  order: "Order",
};

export default function WorkspacePage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const meta = workspaceMockMeta[type] || { type: "Unknown", state: "—", nextActionLabel: "—" };
  const label = TYPE_LABEL[type] || "Workspace";

  return (
    <div data-testid="workspace-page" className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          data-testid="workspace-back"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <StatusBadge type="INFO">Foundation · Sprint 1</StatusBadge>
      </div>

      <header className="dmx-card p-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <span className="dmx-label">{label} Workspace</span>
            <h1
              data-testid="workspace-id"
              className="font-display text-3xl font-semibold tracking-tight text-zinc-950 mt-1 font-mono"
            >
              {id}
            </h1>
            <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
              This is the canonical Workspace shell — Timeline, Documents, Next Actions, and Participants will populate here in subsequent sprints.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge type="WARNING">{meta.state}</StatusBadge>
            <span className="text-xs text-zinc-500">
              Next action: <span className="text-zinc-900 font-medium">{meta.nextActionLabel}</span>
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WorkspaceSection
          testId="workspace-timeline"
          icon={Clock}
          title="Timeline"
          hint="Append-only event log of every state transition"
          colSpan="lg:col-span-2"
        >
          <ul className="space-y-4">
            {["Created", "Participants assigned", "Awaiting next action"].map((s, i) => (
              <li key={s} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-zinc-300" />
                <div className="flex-1">
                  <div className="text-sm text-zinc-900">{s}</div>
                  <div className="text-xs text-zinc-400">— pending Sprint 2 integration</div>
                </div>
                <span className="text-xs text-zinc-400">step {i + 1}</span>
              </li>
            ))}
          </ul>
        </WorkspaceSection>

        <WorkspaceSection
          testId="workspace-next-actions"
          icon={ListTodo}
          title="Next Actions"
          hint="Driven by the global state machine"
        >
          <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
            No actions surfaced yet.
            <br />
            Wired in Sprint 2.
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          testId="workspace-documents"
          icon={FileText}
          title="Documents"
          hint="Shared, versioned, signed where required"
          colSpan="lg:col-span-2"
        >
          <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
            No documents attached.
            <br />
            Upload available from Sprint 2.
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          testId="workspace-participants"
          icon={Users}
          title="Participants"
          hint="Buyer, suppliers, operator and observers"
        >
          <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
            Participants list arrives with assignment workflow.
          </div>
        </WorkspaceSection>
      </section>
    </div>
  );
}

function WorkspaceSection({ icon: Icon, title, hint, children, testId, colSpan = "" }) {
  return (
    <div data-testid={testId} className={`dmx-card p-6 ${colSpan}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-500" />
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
        </div>
        <StatusBadge type="INFO">Placeholder</StatusBadge>
      </div>
      {hint ? <p className="text-xs text-zinc-500 mb-4">{hint}</p> : null}
      {children}
    </div>
  );
}
