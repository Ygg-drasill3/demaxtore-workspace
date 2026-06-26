import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { orderApi } from "../lib/order.api";
import type { ListOrderQuery } from "@dmx/contracts/order.zod";

export function useOrderList(q: Partial<ListOrderQuery>) {
  return useQuery({
    queryKey: ["orders", "list", q],
    queryFn: () => orderApi.list(q),
    placeholderData: keepPreviousData,
  });
}
