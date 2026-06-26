import { Building2, MapPin, Package, StickyNote } from "lucide-react";
import { useT } from "@/i18n/useT";
import { dedupeFields, parseRfqDescription } from "../lib/rfqDescription.parse";

const SECTION_ICONS: Record<string, typeof MapPin> = {
  shipping: MapPin,
  company: Building2,
  "logistics & notes": StickyNote,
};

function iconFor(title: string) {
  const key = title.toLowerCase();
  for (const [k, Icon] of Object.entries(SECTION_ICONS)) {
    if (key.includes(k.split(" ")[0]!)) return Icon;
  }
  return Package;
}

export function RfqDescriptionView({ description }: { description: string }) {
  const { t } = useT();
  const parsed = parseRfqDescription(description);

  if (parsed.fallbackText) {
    return (
      <div
        data-testid="rfq-details-description"
        className="text-sm text-zinc-700 whitespace-pre-wrap rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-5 leading-relaxed shadow-sm"
      >
        {parsed.fallbackText}
      </div>
    );
  }

  return (
    <div data-testid="rfq-details-description" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {parsed.sections.map((section) => {
        const Icon = iconFor(section.title);
        const fields = dedupeFields(section.fields);

        return (
          <section
            key={section.key}
            className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden"
          >
            <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-slate-50 to-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-900/10 text-accent-900">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <h4 className="text-sm font-semibold text-ink-900">{section.title}</h4>
            </header>
            <div className="p-4 space-y-3">
              {fields.length > 0 && (
                <dl className="grid grid-cols-1 gap-2.5">
                  {fields.map((f) => (
                    <div key={`${f.label}-${f.value}`} className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 gap-y-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{f.label}</dt>
                      <dd className="text-sm text-ink-900 break-words">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {section.bullets.length > 0 && (
                <ul className="space-y-1.5">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-zinc-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-900/70" />
                      <span className="break-words">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.prose.length > 0 && (
                <p className="text-sm text-zinc-600 leading-relaxed">{section.prose.join(" ")}</p>
              )}
              {fields.length === 0 && section.bullets.length === 0 && section.prose.length === 0 && (
                <p className="text-sm text-zinc-400">{t("rfq.details.noExtraInfo")}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
