import { useLocale } from "./store";
import type { Locale } from "./types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const t = useLocale((s) => s.t);

  const btn = (code: Locale, label: string) => (
    <button
      type="button"
      data-testid={`lang-${code}`}
      onClick={() => setLocale(code)}
      className={cn(
        "h-8 px-2.5 rounded-md text-xs font-medium transition-colors",
        variant === "dark"
          ? locale === code
            ? "bg-white text-ink-950"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
          : locale === code
            ? "bg-ink-950 text-white"
            : "text-zinc-600 hover:bg-paper-100",
      )}
      aria-pressed={locale === code}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="language-switcher"
      role="group"
      aria-label={t("lang.switch")}
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-lg",
        variant === "dark"
          ? "border border-white/10 bg-white/[0.04]"
          : "border border-paper-200 bg-white",
        className,
      )}
    >
      {btn("tr", "TR")}
      {btn("en", "EN")}
      {btn("fr", "FR")}
    </div>
  );
}
