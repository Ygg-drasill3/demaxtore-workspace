import { Link } from "react-router-dom";
import { ClipboardList, Route, Ship, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/useT";

/** Sprint 43 — orchestrated import entry over existing Direct PO + FreightIQ entities. */
export default function StartImportPage() {
  const { t } = useT();

  return (
    <div
      data-testid="start-import-page"
      className="max-w-[960px] mx-auto space-y-8 animate-fade-in pb-10"
    >
      <header>
        <Link to="/buyer/dashboard" className="text-xs text-zinc-500 hover:text-ink-900 hover:underline">
          ← {t("s43.import.backDashboard", "Dashboard")}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">
          {t("s43.import.startTitle", "Start a new import")}
        </h1>
        <p className="text-sm text-zinc-600 mt-2 max-w-2xl">
          {t(
            "s43.import.startSubtitle",
            "DeMaxtore manages freight and customs while you track the full journey in one workspace. Choose how your import begins.",
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <EntryCard
          testId="start-import-direct-po"
          icon={ClipboardList}
          title={t("s43.import.directPoTitle", "I have a supplier")}
          description={t(
            "s43.import.directPoDesc",
            "Create a purchase order for an existing supplier, then request freight and customs services.",
          )}
          cta={t("s43.import.directPoCta", "Create Purchase Order")}
          to="/buyer/purchase-orders/create"
          primary
        />
        <EntryCard
          testId="start-import-freight-quote"
          icon={Route}
          title={t("s43.import.freightTitle", "I need a freight quote")}
          description={t(
            "s43.import.freightDesc",
            "Request a freight quote on an active order. DeMaxtore Operations will publish offers for your review.",
          )}
          cta={t("s43.import.freightCta", "Request Freight Quote")}
          to="/buyer/freightiq/request"
          primary
        />
      </div>

      <section className="dmx-card p-5 space-y-3" data-testid="start-import-journey-hint">
        <h2 className="text-sm font-semibold text-ink-900">
          {t("s43.import.journeyTitle", "Typical import journey")}
        </h2>
        <ol className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          {[
            t("s43.import.stepPo", "Purchase order"),
            t("s43.import.stepFreight", "Freight quote"),
            t("s43.import.stepShipment", "Shipment"),
            t("s43.import.stepCustoms", "Customs"),
            t("s43.import.stepDelivery", "Delivery"),
            t("s43.import.stepTlc", "Landed cost"),
          ].map((label, i, arr) => (
            <li key={label} className="flex items-center gap-2">
              <span className="rounded-full bg-paper-100 px-2.5 py-1 font-medium text-ink-800">{label}</span>
              {i < arr.length - 1 && <span className="text-zinc-300">→</span>}
            </li>
          ))}
        </ol>
        <p className="text-xs text-zinc-500">
          {t(
            "s43.import.opsNote",
            "Some steps involve DeMaxtore Operations (offer publication, broker assignment). You will always see status and next actions here.",
          )}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <SecondaryLink
          testId="start-import-shipments"
          icon={Ship}
          label={t("s43.import.trackShipments", "Track existing shipments")}
          to="/buyer/shipments"
        />
        <SecondaryLink
          testId="start-import-customs"
          icon={ShieldCheck}
          label={t("s43.import.viewCustoms", "View customs cases")}
          to="/buyer/customs"
        />
      </div>
    </div>
  );
}

function EntryCard({
  testId,
  icon: Icon,
  title,
  description,
  cta,
  to,
  primary,
}: {
  testId: string;
  icon: typeof Route;
  title: string;
  description: string;
  cta: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className={`dmx-card dmx-card-hover p-6 flex flex-col gap-4 min-h-[200px] ${
        primary ? "ring-1 ring-accent-900/10" : ""
      }`}
    >
      <span className="h-11 w-11 rounded-xl bg-accent-900 text-white grid place-items-center">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
        <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">{description}</p>
      </div>
      <span className="text-sm font-medium text-accent-900">{cta} →</span>
    </Link>
  );
}

function SecondaryLink({
  testId,
  icon: Icon,
  label,
  to,
}: {
  testId: string;
  icon: typeof Route;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="flex items-center gap-3 rounded-xl border border-paper-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 hover:border-paper-300"
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      {label}
    </Link>
  );
}
