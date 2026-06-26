import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./types";
import en from "./locales/en";
import tr from "./locales/tr";
import fr from "./locales/fr";

const STORAGE_KEY = "demax_locale";

const CATALOG = { en, tr, fr } as const;

function detectLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "tr" || saved === "en" || saved === "fr") return saved;
  const lang = (navigator.language || "tr").toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("fr")) return "fr";
  return "tr";
}

function applyHtmlLang(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
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
