export type Locale = "en" | "tr" | "fr" | "ar";

export type TranslationDict = Record<string, string>;

/** Locales rendered right-to-left. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];
