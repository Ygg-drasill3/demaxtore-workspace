import { useCallback } from "react";
import { useLocale } from "./store";

export function useT() {
  const locale = useLocale((s) => s.locale);
  const tRaw = useLocale((s) => s.t);
  const t = useCallback(
    (key: string, fallback?: string, vars?: Record<string, string | number>) => tRaw(key, fallback, vars),
    [tRaw, locale],
  );
  return { t, locale };
}
