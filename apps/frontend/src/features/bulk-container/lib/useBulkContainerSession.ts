import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { bulkContainerApi } from "./bulk-container.api";

/** Keeps the active bulk container id in catalog URLs while browsing products. */
export function useBulkContainerSession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const containerId = searchParams.get("containerId") ?? undefined;

  const setContainerId = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("containerId", id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const withContainerId = useCallback(
    (path: string) => {
      if (!containerId) return path;
      const sep = path.includes("?") ? "&" : "?";
      return `${path}${sep}containerId=${encodeURIComponent(containerId)}`;
    },
    [containerId],
  );

  const ensureContainer = useCallback(async () => {
    if (containerId) {
      const bc = await bulkContainerApi.get(containerId);
      if (!bc.isFull) return containerId;
    }
    const bc = await bulkContainerApi.ensureActive();
    setContainerId(bc.id);
    return bc.id;
  }, [containerId, setContainerId]);

  return { containerId, setContainerId, ensureContainer, withContainerId };
}
