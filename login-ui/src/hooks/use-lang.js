import { useState } from "react";

const STORAGE_KEY = "dmx.login.lang";

function readInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "TR" || saved === "EN" || saved === "FR") return saved;
  } catch {
    /* private browsing */
  }
  // Default is always English — do not infer from browser language.
  return "EN";
}

export function useLang() {
  const [lang, setLangState] = useState(readInitialLang);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return [lang, setLang];
}
