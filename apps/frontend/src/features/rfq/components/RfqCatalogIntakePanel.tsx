import { ClipboardList, UserRound } from "lucide-react";
import type { RfqDTO } from "@dmx/contracts/rfq.zod";
import { useT } from "@/i18n/useT";
import { CATALOG_FORM_FIELDS, resolveCatalogIntake } from "../lib/catalogIntake";

type Props = {
  rfq: Pick<RfqDTO, "productCategory" | "productDescription" | "targetMarket" | "title" | "catalogIntake">;
};

function FieldGrid({
  title,
  icon: Icon,
  fields,
  intake,
  t,
}: {
  title: string;
  icon: typeof ClipboardList;
  fields: typeof CATALOG_FORM_FIELDS;
  intake: NonNullable<ReturnType<typeof resolveCatalogIntake>>;
  t: (k: string) => string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-slate-50 to-white">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-900/10 text-accent-900">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
      </header>
      <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map(({ key, labelKey, required }) => {
          const value = intake[key];
          return (
            <div key={key} className={key === "requestDetails" ? "sm:col-span-2" : ""}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t(labelKey)}
                {required ? <span className="text-red-500 ml-0.5">*</span> : null}
              </dt>
              <dd className="mt-1 text-sm text-ink-900 whitespace-pre-wrap break-words">
                {value?.trim() ? value : "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function RfqCatalogIntakePanel({ rfq }: Props) {
  const { t } = useT();
  const intake = resolveCatalogIntake(rfq);
  if (!intake) return null;

  const requestFields = CATALOG_FORM_FIELDS.filter((f) =>
    ["productOrService", "deliveryLocation", "quantity", "supplierType", "requestDetails"].includes(f.key),
  );
  const contactFields = CATALOG_FORM_FIELDS.filter((f) =>
    ["businessEmail", "companyName", "contactPerson", "phone", "sessionId"].includes(f.key),
  );

  return (
    <div data-testid="rfq-catalog-intake" className="space-y-4">
      <p className="text-xs text-zinc-500">{t("rfq.catalog.mandatoryHint")}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FieldGrid
          title={t("rfq.catalog.requestSection")}
          icon={ClipboardList}
          fields={requestFields}
          intake={intake}
          t={t}
        />
        <FieldGrid
          title={t("rfq.catalog.contactSection")}
          icon={UserRound}
          fields={contactFields}
          intake={intake}
          t={t}
        />
      </div>
    </div>
  );
}
