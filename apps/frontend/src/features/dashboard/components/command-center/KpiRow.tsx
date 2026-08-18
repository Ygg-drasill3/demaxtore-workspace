import { Link } from "react-router-dom";
import { FileText, Gavel, Package, Ship, MessageSquare, AlertCircle, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterKpis } from "../../lib/buyer-command-center";
import { useT } from "@/i18n/useT";

const KPIS = [
  { key: "openRfqs" as const, labelKey: "rfq.list.title", fallback: "Open RFQs", to: "/buyer/rfq", icon: FileText, testId: "cc-kpi-open-rfqs", tone: "accent" },
  { key: "liveAuctions" as const, labelKey: "cb.list.title", fallback: "Live Auctions", to: "/buyer/commoditybid", icon: Gavel, testId: "cc-kpi-live-auctions", tone: "emerald" },
  { key: "awaitingAuctionApproval" as const, labelKey: "dash.kpi.awaitingApproval", fallback: "Awaiting Approval", to: "/buyer/commoditybid", icon: AlertCircle, testId: "cc-kpi-awaiting-auction-approval", tone: "amber" },
  { key: "activeOrders" as const, labelKey: "dash.kpi.activeOrders", fallback: "Active Orders", to: "/buyer/orders", icon: Package, testId: "cc-kpi-active-orders", tone: "blue" },
  { key: "shipmentsInTransit" as const, labelKey: "dash.kpi.shipmentsInTransit", fallback: "Shipments in transit", to: "/shipments/portfolio", icon: Ship, testId: "cc-kpi-shipments", tone: "violet" },
  { key: "unreadMessages" as const, labelKey: "dash.kpi.unreadMessages", fallback: "Unread Messages", to: "/buyer/messages", icon: MessageSquare, testId: "cc-kpi-unread-messages", tone: "rose" },
  { key: "estimatedCifReady" as const, labelKey: "dash.kpi.estimatedCifReady", fallback: "Est. CIF Ready", to: "/buyer/rfq", icon: Calculator, testId: "cc-kpi-estimated-cif-ready", tone: "accent" },
] as const;

const TONE_STYLES = {
  accent:  { icon: "bg-accent-50 text-accent-900",   ring: "hover:ring-accent-900/15" },
  emerald: { icon: "bg-emerald-50 text-emerald-800", ring: "hover:ring-emerald-500/20" },
  amber:   { icon: "bg-amber-50 text-amber-800",     ring: "hover:ring-amber-500/20" },
  blue:    { icon: "bg-blue-50 text-blue-800",       ring: "hover:ring-blue-500/20" },
  violet:  { icon: "bg-violet-50 text-violet-800",   ring: "hover:ring-violet-500/20" },
  rose:    { icon: "bg-rose-50 text-rose-800",       ring: "hover:ring-rose-500/20" },
};

export function KpiRow({ kpis, loading }: { kpis?: CommandCenterKpis; loading?: boolean }) {
  const { t } = useT();
  return (
    <section data-testid="cc-kpi-row" data-guide="dashboard-kpis" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
      {KPIS.map(({ key, labelKey, fallback, to, icon: Icon, testId, tone }) => {
        const value = loading ? "—" : (kpis?.[key] ?? 0);
        const hasValue = !loading && (kpis?.[key] ?? 0) > 0;
        const styles = TONE_STYLES[tone];

        return (
          <Link
            key={key}
            to={to}
            data-testid={testId}
            className={cn(
              "group dmx-card dmx-card-hover p-4 flex flex-col gap-3 min-h-[96px] ring-1 ring-transparent transition-all",
              styles.ring,
              hasValue && "border-paper-200",
            )}
          >
            <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105", styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-2xl font-semibold tabular-nums leading-none">
                {value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5 truncate">
                {t(labelKey, fallback)}
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
