import type { InboxSummaryCards } from "@dmx/contracts/workspace-inbox";
import { Briefcase, AlertCircle, Mail, MessageCircle, CheckCircle2, Ship, Clock, ClipboardCheck } from "lucide-react";

interface Props {
  summary: InboxSummaryCards;
}

const CARDS: Array<{
  key: keyof InboxSummaryCards;
  label: string;
  icon: typeof Briefcase;
  accent: string;
}> = [
  { key: "activeWorkspaces", label: "Active Workspaces", icon: Briefcase, accent: "text-zinc-700" },
  { key: "pendingActions", label: "Pending Actions", icon: AlertCircle, accent: "text-rose-700" },
  { key: "unreadConversations", label: "Unread Conversations", icon: Mail, accent: "text-blue-700" },
  { key: "waitingSupplierResponses", label: "Waiting Supplier", icon: MessageCircle, accent: "text-amber-700" },
  { key: "waitingBuyerApprovals", label: "Buyer Approvals", icon: CheckCircle2, accent: "text-violet-700" },
  { key: "activeShipments", label: "Active Shipments", icon: Ship, accent: "text-sky-700" },
  { key: "delayedShipments", label: "Delayed Shipments", icon: Clock, accent: "text-red-700" },
  { key: "openInspections", label: "Open Inspections", icon: ClipboardCheck, accent: "text-orange-700" },
];

export default function InboxSummaryRow({ summary }: Props) {
  return (
    <div
      data-testid="inbox-summary"
      className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3"
    >
      {CARDS.map(({ key, label, icon: Icon, accent }) => (
        <div
          key={key}
          data-testid={`inbox-summary-${key}`}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${accent}`} />
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium leading-tight">{label}</p>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums">{summary[key]}</p>
        </div>
      ))}
    </div>
  );
}
