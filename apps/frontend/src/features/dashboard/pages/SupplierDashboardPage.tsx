// Sprint 10B — Supplier Command Center Dashboard
import { Link } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { useSupplierCommandCenter } from "../hooks/useSupplierCommandCenter";
import { SupplierKpiRow } from "../components/supplier-command-center/SupplierKpiRow";
import { SupplierActionInbox } from "../components/supplier-command-center/SupplierActionInbox";
import { OpportunityCenter } from "../components/supplier-command-center/OpportunityCenter";
import { ExecutionCenter } from "../components/supplier-command-center/ExecutionCenter";
import { SupplierDocumentCenter } from "../components/supplier-command-center/SupplierDocumentCenter";
import { SupplierCommunicationCenter } from "../components/supplier-command-center/SupplierCommunicationCenter";
import { SupplierUpcomingEvents } from "../components/supplier-command-center/SupplierUpcomingEvents";
import { SupplierOnboardingSection } from "../components/supplier-command-center/SupplierOnboardingSection";

export default function SupplierDashboardPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useSupplierCommandCenter();
  const firstName = user?.displayName?.split(" ")[0] ?? "Supplier";

  return (
    <div
      data-testid="supplier-dashboard"
      data-dashboard-mode={data?.mode ?? "active_supplier"}
      className="max-w-[1400px] mx-auto space-y-6 animate-fade-in"
    >
      <header>
        <span className="dmx-eyebrow text-zinc-500">{t("dash.supplier.eyebrow")}</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">
          {t("dash.supplier.hello", undefined, { name: firstName })}
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          {t("dash.supplier.subtitle")}
        </p>
      </header>

      <SupplierKpiRow kpis={data?.kpis} loading={isLoading} />
      <SupplierActionInbox actions={data?.actions} loading={isLoading} />
      <OpportunityCenter rows={data?.opportunities} loading={isLoading} />
      <ExecutionCenter rows={data?.execution} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SupplierDocumentCenter rows={data?.documents} loading={isLoading} />
        <SupplierCommunicationCenter rows={data?.communications} loading={isLoading} />
        <SupplierUpcomingEvents events={data?.upcomingEvents} loading={isLoading} />
      </div>

      <SupplierOnboardingSection mode={data?.mode ?? "active_supplier"} />

      <p className="text-xs text-zinc-400 text-center">
        <Link to="/supplier/rfq" className="hover:underline">{t("dash.supplier.link.rfq")}</Link>
        {" · "}
        <Link to="/supplier/commoditybid" className="hover:underline">{t("dash.supplier.link.auctions")}</Link>
        {" · "}
        <Link to="/supplier/orders" className="hover:underline">{t("dash.supplier.link.orders")}</Link>
      </p>
    </div>
  );
}
