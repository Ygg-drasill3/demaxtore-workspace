import { Link } from "react-router-dom";
import RfqCatalogEmbedPage from "./RfqCatalogEmbedPage";
import { useT } from "@/i18n/useT";

/** New quote request — catalog embed with customer chrome only. */
export default function RfqCreatePage() {
  const { t } = useT();
  return (
    <div data-testid="rfq-create-page" className="space-y-4 animate-fade-in">
      <header className="max-w-[1400px] mx-auto px-1">
        <Link to="/buyer/rfq" className="text-xs text-zinc-500 hover:text-ink-900 hover:underline">
          ← {t("rfq.list.title", "My quote requests")}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">
          {t("rfq.create.title", "Create quote request")}
        </h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
          {t("rfq.create.subtitle", "Describe what you need. Invited suppliers will send comparable quotes.")}
        </p>
      </header>
      <RfqCatalogEmbedPage />
    </div>
  );
}
