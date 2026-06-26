import { api } from "@/lib/api";

export const portfolioApi = {
  purchaseOrders: (params?: { limit?: number; offset?: number }) =>
    api.get("/portfolio/purchase-orders", { params }).then((r) => r.data as {
      items: unknown[];
      total: number;
    }),

  shipments: (params?: { limit?: number; offset?: number }) =>
    api.get("/portfolio/shipments", { params }).then((r) => r.data as {
      items: unknown[];
      total: number;
    }),

  tradeDocuments: (params?: { limit?: number; offset?: number }) =>
    api.get("/portfolio/trade-documents", { params }).then((r) => r.data as {
      items: unknown[];
      total: number;
    }),

  messages: (params?: { limit?: number; offset?: number }) =>
    api.get("/portfolio/messages", { params }).then((r) => r.data as {
      items: unknown[];
      total: number;
    }),
};
