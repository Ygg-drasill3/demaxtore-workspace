import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
async function upsertCatalogAlert(db, input) {
    const dedupeKey = `${input.alertKey}:${input.productRef}`;
    const existing = await db.controlTowerAlert.findFirst({
        where: { alertKey: dedupeKey, resolvedAt: null },
    });
    if (existing)
        return false;
    try {
        await db.controlTowerAlert.create({
            data: {
                severity: "WARNING",
                category: "SYSTEM",
                alertKey: dedupeKey,
                workspaceId: null,
                workspaceType: input.workspaceType,
                title: input.title,
                description: input.description,
            },
        });
        return true;
    }
    catch {
        return false;
    }
}
export async function scanPackingAlerts(db) {
    let n = 0;
    const mcProducts = await db.catalogProduct.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, productRef: true, name: true },
        take: 200,
    });
    for (const p of mcProducts) {
        const count = await db.productPackingType.count({
            where: { catalogKind: "MIXED_CONTAINER", productId: p.id, isActive: true, packingType: { isActive: true } },
        });
        if (count === 0) {
            if (await upsertCatalogAlert(db, {
                alertKey: AlertKey.PRODUCT_MISSING_PACKING_TYPE,
                workspaceType: "MIXED_CONTAINER",
                productRef: p.productRef,
                title: "Product missing packing type",
                description: `${p.productRef} (${p.name}) has no active packing type assigned.`,
            })) {
                n++;
            }
        }
    }
    const bcProducts = await db.bulkCatalogProduct.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, productRef: true, name: true },
        take: 200,
    });
    for (const p of bcProducts) {
        const count = await db.productPackingType.count({
            where: { catalogKind: "BULK_CONTAINER", productId: p.id, isActive: true, packingType: { isActive: true } },
        });
        if (count === 0) {
            if (await upsertCatalogAlert(db, {
                alertKey: AlertKey.PRODUCT_MISSING_PACKING_TYPE,
                workspaceType: "BULK_CONTAINER",
                productRef: p.productRef,
                title: "Product missing packing type",
                description: `${p.productRef} (${p.name}) has no active packing type assigned.`,
            })) {
                n++;
            }
        }
    }
    const deactivatedLines = await db.containerLine.findMany({
        where: { removedAt: null, packingType: { isActive: false } },
        include: { workspace: true, packingType: true },
        take: 50,
    });
    for (const line of deactivatedLines) {
        if (await upsertControlTowerAlert(db, {
            workspaceId: line.workspaceId,
            alertKey: AlertKey.PACKING_TYPE_DEACTIVATED,
            severity: "WARNING",
            category: "MIXED_CONTAINER",
            workspaceType: "MIXED_CONTAINER",
            title: "Packing type deactivated",
            description: `${line.workspace.externalRef} line uses deactivated packing type ${line.packingType.code}.`,
        })) {
            n++;
        }
    }
    const deactivatedBcLines = await db.bulkContainerLine.findMany({
        where: { removedAt: null, packingType: { isActive: false } },
        include: { workspace: true, packingType: true },
        take: 50,
    });
    for (const line of deactivatedBcLines) {
        if (await upsertControlTowerAlert(db, {
            workspaceId: line.workspaceId,
            alertKey: AlertKey.PACKING_TYPE_DEACTIVATED,
            severity: "WARNING",
            category: "BULK_CONTAINER",
            workspaceType: "BULK_CONTAINER",
            title: "Packing type deactivated",
            description: `${line.workspace.externalRef} line uses deactivated packing type ${line.packingType.code}.`,
        })) {
            n++;
        }
    }
    return n;
}
//# sourceMappingURL=packing-alerts.js.map