import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth.store";

/** True once zustand persist has restored sessionStorage into the auth store. */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuth.persist.hasHydrated());

  useEffect(() => {
    if (useAuth.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuth.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
