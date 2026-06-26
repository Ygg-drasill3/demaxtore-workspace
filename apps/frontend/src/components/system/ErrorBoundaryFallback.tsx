import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";

interface Props {
  message: string;
  onReload: () => void;
}

export function ErrorBoundaryFallback({ message, onReload }: Props) {
  const { t } = useT();
  const msg = message.toLowerCase();
  const isStaleChunk =
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed");

  return (
    <div
      data-testid="error-boundary"
      className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6 py-16"
    >
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("error.boundary.title")}</h1>
      <p className="text-sm text-zinc-500 mt-2 max-w-md">
        {isStaleChunk ? t("error.boundary.staleChunk") : t("error.boundary.body")}
      </p>
      <p className="text-xs text-zinc-400 mt-3 font-mono max-w-lg truncate">{message}</p>
      <div className="flex gap-3 mt-6">
        <Button onClick={onReload}>{t("error.boundary.refresh")}</Button>
        <Link to="/">
          <Button variant="secondary">{t("error.boundary.home")}</Button>
        </Link>
      </div>
    </div>
  );
}
