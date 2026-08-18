import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RTL_LOCALES, type Locale } from "./types";
import en from "./locales/en";
import tr from "./locales/tr";
import fr from "./locales/fr";
import ar from "./locales/ar";

const STORAGE_KEY = "demax_locale";

const CATALOG = { en, tr, fr, ar } as const;

const isLocale = (v: unknown): v is Locale =>
  v === "en" || v === "tr" || v === "fr" || v === "ar";

function detectLocale(): Locale {
  // Default is always English — do not infer from browser language.
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "en";
    // Legacy plain value
    if (isLocale(raw)) return raw;
    // Zustand persist payload
    const parsed = JSON.parse(raw) as { state?: { locale?: string } };
    const saved = parsed?.state?.locale;
    if (isLocale(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

function applyHtmlLang(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }
}

type Vars = Record<string, string | number>;

function applyVars(text: string, vars?: Vars): string {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    text,
  );
}

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string, vars?: Vars) => string;
};

export const useLocale = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: detectLocale(),
      setLocale: (locale) => {
        applyHtmlLang(locale);
        set({ locale });
      },
      t: (key, fallback, vars) => {
        const dict = CATALOG[get().locale];
        const raw = dict[key] ?? CATALOG.en[key] ?? fallback ?? key;
        return applyVars(raw, vars);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ locale: s.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) applyHtmlLang(state.locale);
      },
    },
  ),
);

applyHtmlLang(detectLocale());
