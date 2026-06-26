import { api } from "@/lib/api";
import type { ShipmentPortfolioPayload, ShipmentPortfolioQuery } from "@dmx/contracts/shipment-portfolio";

export const shipmentPortfolioApi = {
  getPortfolio: (params?: Partial<ShipmentPortfolioQuery>) =>
    api.get<ShipmentPortfolioPayload>("/shipments/portfolio", { params }).then((r) => r.data),
};
