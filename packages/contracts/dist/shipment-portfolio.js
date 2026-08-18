import { z } from "zod";
export const ShipmentPortfolioStatus = [
    "On Track",
    "At Risk",
    "Delayed",
    "Delivered",
    "Cancelled",
];
export const ShipmentPortfolioMilestone = [
    "Production",
    "Ready For Loading",
    "Loaded",
    "Export Customs",
    "Vessel Departure",
    "In Transit",
    "Transshipment",
    "Arrival",
    "Import Customs",
    "Delivered",
];
export const ShipmentPortfolioTradeType = [
    "RFQ",
    "COMMODITYBID",
    "MIXED_CONTAINER",
    "BULK_CONTAINER",
];
export const ShipmentPortfolioQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.enum(ShipmentPortfolioStatus).optional(),
    buyerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    carrier: z.string().optional(),
    country: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    tradeType: z.enum(ShipmentPortfolioTradeType).optional(),
    search: z.string().optional(),
});
