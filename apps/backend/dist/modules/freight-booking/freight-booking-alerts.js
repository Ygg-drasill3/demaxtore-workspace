import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
const CUTOFF_RISK_MS = 3 * 86_400_000;
const NOT_CONFIRMED_MS = 5 * 86_400_000;
export async function scanFreightBookingAlerts(db) {
    let n = 0;
    const now = new Date();
    const cutoffSoon = new Date(now.getTime() + CUTOFF_RISK_MS);
    const openBookings = await db.freightBooking.findMany({
        where: { status: { in: ["UNDER_REVIEW", "APPROVED", "REBOOK_REQUIRED"] } },
        include: {
            trade: { select: { externalRef: true, type: true } },
            carrierOptions: {
                where: { status: { in: ["AVAILABLE", "RECOMMENDED", "SELECTED"] } },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
    });
    for (const booking of openBookings) {
        const risky = booking.carrierOptions.some((o) => o.cutoffDate <= cutoffSoon);
        if (risky) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: booking.tradeId,
                alertKey: AlertKey.BOOKING_CUTOFF_RISK,
                severity: "WARNING",
                category: "FREIGHT",
                workspaceType: booking.trade.type,
                title: "Booking cut-off risk",
                description: `Carrier cut-off for ${booking.trade.externalRef} is approaching before cargo ready.`,
            }))
                n++;
        }
        if (booking.status === "APPROVED" && booking.approvedAt
            && booking.approvedAt.getTime() + NOT_CONFIRMED_MS <= now.getTime()) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: booking.tradeId,
                alertKey: AlertKey.BOOKING_NOT_CONFIRMED,
                severity: "CRITICAL",
                category: "FREIGHT",
                workspaceType: booking.trade.type,
                title: "Booking not confirmed",
                description: `Approved booking for ${booking.trade.externalRef} has not been confirmed.`,
            }))
                n++;
        }
        if (booking.status === "REBOOK_REQUIRED") {
            if (await upsertControlTowerAlert(db, {
                workspaceId: booking.tradeId,
                alertKey: AlertKey.BOOKING_REBOOKING_REQUIRED,
                severity: "CRITICAL",
                category: "FREIGHT",
                workspaceType: booking.trade.type,
                title: "Booking rebooking required",
                description: `Cargo forecast changed for ${booking.trade.externalRef}; rebooking is required.`,
            }))
                n++;
        }
    }
    const revisedForecasts = await db.cargoReadyForecast.findMany({
        where: {
            status: "REVISED",
            updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) },
        },
        include: { trade: { select: { externalRef: true, type: true } } },
        orderBy: { updatedAt: "desc" },
        take: 30,
    });
    for (const fc of revisedForecasts) {
        const active = await db.cargoReadyForecast.findFirst({
            where: { tradeId: fc.tradeId, status: "ACTIVE" },
        });
        if (!active)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: fc.tradeId,
            alertKey: AlertKey.BOOKING_FORECAST_CHANGED,
            severity: "WARNING",
            category: "FREIGHT",
            workspaceType: fc.trade.type,
            title: "Cargo ready forecast changed",
            description: `Supplier revised cargo ready forecast for ${fc.trade.externalRef}.`,
        }))
            n++;
    }
    return n;
}
//# sourceMappingURL=freight-booking-alerts.js.map