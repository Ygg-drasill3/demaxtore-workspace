import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
const H_72 = 72 * 3_600_000;
export async function scanTradeDocumentAlerts(db) {
    let n = 0;
    const now = new Date();
    const cutoff = new Date(now.getTime() - H_72);
    const requirements = await db.documentRequirement.findMany({
        where: { required: true },
        take: 200,
    });
    for (const req of requirements) {
        const doc = await db.tradeDocument.findUnique({
            where: {
                workspaceType_workspaceId_documentType: {
                    workspaceType: req.workspaceType,
                    workspaceId: req.workspaceId,
                    documentType: req.documentType,
                },
            },
        });
        const ws = await db.workspace.findUnique({
            where: { id: req.workspaceId },
            select: { externalRef: true, state: true, type: true },
        });
        if (!ws)
            continue;
        const wsType = req.workspaceType === "SHIPMENT" ? "SHIPMENT" : "ORDER";
        if (!doc || doc.status === "MISSING" || doc.status === "REQUESTED") {
            if (await upsertControlTowerAlert(db, {
                workspaceId: req.workspaceId,
                alertKey: AlertKey.TRADE_DOC_REQUIRED_MISSING,
                severity: "WARNING",
                category: "ORDER",
                workspaceType: wsType,
                title: "Required trade document missing",
                description: `${req.documentType} missing on ${ws.externalRef}.`,
            }))
                n++;
            if (req.createdAt <= cutoff && (!doc || doc.status !== "APPROVED")) {
                if (await upsertControlTowerAlert(db, {
                    workspaceId: req.workspaceId,
                    alertKey: AlertKey.TRADE_DOC_MISSING_72H,
                    severity: "CRITICAL",
                    category: "ORDER",
                    workspaceType: wsType,
                    title: "Required document missing >72h",
                    description: `${req.documentType} still not approved on ${ws.externalRef}.`,
                }))
                    n++;
            }
        }
        if (doc?.status === "UPLOADED" || doc?.status === "UNDER_REVIEW") {
            if (await upsertControlTowerAlert(db, {
                workspaceId: req.workspaceId,
                alertKey: AlertKey.TRADE_DOC_REQUIRED_MISSING,
                severity: "INFO",
                category: "ORDER",
                workspaceType: wsType,
                title: "Document pending review",
                description: `${req.documentType} awaiting review on ${ws.externalRef}.`,
            }))
                n++;
        }
        if (doc?.expiresAt && doc.expiresAt.getTime() <= now.getTime() + 30 * 86_400_000) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: req.workspaceId,
                alertKey: AlertKey.TRADE_DOC_REQUIRED_MISSING,
                severity: "WARNING",
                category: "ORDER",
                workspaceType: wsType,
                title: "Document expiring soon",
                description: `${req.documentType} expires on ${doc.expiresAt.toISOString().slice(0, 10)}.`,
            }))
                n++;
        }
        if (doc?.status === "REJECTED") {
            if (await upsertControlTowerAlert(db, {
                workspaceId: req.workspaceId,
                alertKey: AlertKey.TRADE_DOC_REJECTED,
                severity: "WARNING",
                category: "ORDER",
                workspaceType: wsType,
                title: "Trade document rejected",
                description: `${req.documentType} rejected on ${ws.externalRef}.`,
            }))
                n++;
        }
    }
    const deliveredIncomplete = await db.workspace.findMany({
        where: { type: "SHIPMENT", state: "DELIVERED" },
        take: 50,
    });
    for (const ws of deliveredIncomplete) {
        const compliance = await db.documentRequirement.findMany({
            where: { workspaceType: "SHIPMENT", workspaceId: ws.id, required: true },
        });
        const docs = await db.tradeDocument.findMany({
            where: { workspaceType: "SHIPMENT", workspaceId: ws.id },
        });
        const approved = new Set(docs.filter((d) => d.status === "APPROVED").map((d) => d.documentType));
        const missing = compliance.filter((r) => !approved.has(r.documentType));
        if (missing.length === 0)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: ws.id,
            alertKey: AlertKey.TRADE_DOC_DELIVERED_INCOMPLETE,
            severity: "CRITICAL",
            category: "ORDER",
            workspaceType: "SHIPMENT",
            title: "Shipment delivered with incomplete documents",
            description: `${ws.externalRef} delivered but ${missing.length} required doc(s) not approved.`,
        }))
            n++;
    }
    return n;
}
//# sourceMappingURL=trade-documents-alerts.js.map