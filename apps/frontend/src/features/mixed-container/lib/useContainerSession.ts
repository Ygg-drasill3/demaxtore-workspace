import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { mixedContainerApi } from "./mixed-container.api";

export function useContainerSession() {
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
      return `${path}${sep}containerId=${containerId}`;
    },
    [containerId],
  );

  const ensureContainer = useCallback(async () => {
    if (containerId) return containerId;
    const mc = await mixedContainerApi.create({ containerType: "CONTAINER_40FT", currency: "USD" });
    setContainerId(mc.id);
    return mc.id;
  }, [containerId, setContainerId]);

  return { containerId, setContainerId, ensureContainer, withContainerId };
}
