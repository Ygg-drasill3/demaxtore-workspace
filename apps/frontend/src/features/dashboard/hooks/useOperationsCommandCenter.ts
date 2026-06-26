import { useQuery } from "@tanstack/react-query";
import { fetchOperationsCommandCenter } from "../lib/operations-command-center";
import { STALE } from "@/lib/queryClient";

export function useOperationsCommandCenter() {
  return useQuery({
    queryKey: ["admin", "operations-command-center"],
    queryFn: fetchOperationsCommandCenter,
    staleTime: STALE.controlTower,
    refetchInterval: 60_000,
  });
}
