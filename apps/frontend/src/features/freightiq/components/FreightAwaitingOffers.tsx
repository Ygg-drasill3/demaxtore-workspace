import { Clock, Ship } from "lucide-react";
import { useT } from "@/i18n/useT";

interface Props {
  contactedCount: number;
  respondedCount: number;
}

export function FreightAwaitingOffers({ contactedCount, respondedCount }: Props) {
  const { t } = useT();

  return (
    <section data-testid="freightiq-awaiting-offers" className="dmx-card p-6 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 text-amber-700 grid place-items-center mb-4">
        <Clock className="h-7 w-7" />
      </div>
      <h4 className="font-display text-lg font-semibold">{t("order.freightiq.awaitingOffers")}</h4>
      <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">{t("order.freightiq.awaitingOffersDetail")}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-100 px-3 py-1.5 text-zinc-600">
          <Ship className="h-3.5 w-3.5" />
          {t("order.freightiq.forwardersContacted").replace("{count}", String(contactedCount))}
        </span>
        {respondedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">
            {t("order.freightiq.forwardersResponded").replace("{count}", String(respondedCount))}
          </span>
        )}
      </div>
    </section>
  );
}
