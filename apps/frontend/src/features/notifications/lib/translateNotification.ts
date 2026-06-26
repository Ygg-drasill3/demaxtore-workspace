/** Resolve notification title — handles legacy rows stored as raw i18n/event keys. */
export function translateNotificationTitle(
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string,
  title: string,
  titleKey?: string | null,
): string {
  const key = titleKey ?? title;
  if (key.includes(".")) {
    const notifKey = key.startsWith("notification.") ? key : `notification.${key}`;
    const translated = t(notifKey, undefined, extractRefVars(title));
    if (translated !== notifKey) return translated;
    const direct = t(key, undefined, extractRefVars(title));
    if (direct !== key) return direct;
  }
  if (title.includes(".") && /^[a-z][\w.]*$/i.test(title)) {
    const notifKey = title.startsWith("notification.") ? title : `notification.${title}`;
    const translated = t(notifKey, undefined);
    if (translated !== notifKey) return translated;
  }
  return title;
}

function extractRefVars(title: string): Record<string, string> | undefined {
  const m = title.match(/[—–-]\s*(\S+)\s*$/);
  return m ? { ref: m[1] } : undefined;
}
