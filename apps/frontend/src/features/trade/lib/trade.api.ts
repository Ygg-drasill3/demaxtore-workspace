import { api } from "@/lib/api";
import type { TradeWorkspacePayload } from "@dmx/contracts/trade-workspace";

export const tradeApi = {
  getWorkspace: (id: string) =>
    api.get<TradeWorkspacePayload>(`/trades/${id}/workspace`).then((r) => r.data),
};
