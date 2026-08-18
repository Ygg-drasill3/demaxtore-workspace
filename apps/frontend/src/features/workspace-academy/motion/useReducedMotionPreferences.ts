import { useEffect, useState } from "react";

export interface GuideMotionPreferences {
  reducedMotion: boolean;
  rtl: boolean;
  isMobile: boolean;
}

export function useReducedMotionPreferences(): GuideMotionPreferences {
  const [prefs, setPrefs] = useState<GuideMotionPreferences>(() => readPrefs());

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      const next = readPrefs();
      setPrefs((prev) =>
        prev.reducedMotion === next.reducedMotion &&
        prev.rtl === next.rtl &&
        prev.isMobile === next.isMobile
          ? prev
          : next,
      );
    };
    mqMotion.addEventListener("change", sync);
    mqMobile.addEventListener("change", sync);
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "class"] });
    window.addEventListener("resize", sync);
    return () => {
      mqMotion.removeEventListener("change", sync);
      mqMobile.removeEventListener("change", sync);
      obs.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return prefs;
}

function readPrefs(): GuideMotionPreferences {
  if (typeof window === "undefined") {
    return { reducedMotion: false, rtl: false, isMobile: false };
  }
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    rtl: document.documentElement.dir === "rtl",
    isMobile: window.matchMedia("(max-width: 767px)").matches,
  };
}
