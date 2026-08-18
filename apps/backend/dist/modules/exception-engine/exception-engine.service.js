import { AlertKey } from "@dmx/contracts/control-tower";
import { env } from "../../config/env.js";
const ESCALATION_HOURS = {
    Critical: 24,
    High: 48,
    Medium: 72,
    Low: null,
};
export function isExceptionEngineV2Enabled() {
    return env.EXCEPTION_ENGINE_V2_ENABLED === true;
}
export class ExceptionEngineService {
    db;
    constructor(db) {
        this.db = db;
    }
    async upsertFromAlert(input) {
        if (!isExceptionEngineV2Enabled())
            return null;
        const exceptionType = this.mapAlertToType(input.alertKey);
        const dedupKey = `${exceptionType}:${input.workspaceId}:${input.alertKey}`;
        const existing = await this.db.tradeException.findFirst({
            where: {
                workspaceId: input.workspaceId,
                exceptionType,
                status: "Open",
            },
        });
        if (existing)
            return existing.id;
        const sev = this.normalizeSeverity(input.severity);
        const dueHours = ESCALATION_HOURS[sev];
        const dueDate = dueHours ? new Date(Date.now() + dueHours * 3_600_000) : null;
        const row = await this.db.tradeException.create({
            data: {
                alertId: input.alertId,
                tradeRootId: input.tradeRootId,
                workspaceId: input.workspaceId,
                workspaceType: input.workspaceType,
                exceptionType,
                severity: sev,
                status: "Open",
                requiredAction: input.title,
                dueDate,
                ownerRole: this.defaultOwnerRole(input.alertKey),
            },
        });
        await this.db.timelineEvent.create({
            data: {
                workspaceId: input.workspaceId,
                eventType: "exception.case.created",
                actorUserId: null,
                payload: { exceptionId: row.id, dedupKey },
            },
        });
        return row.id;
    }
    mapAlertToType(alertKey) {
        const map = {
            [AlertKey.ORDER_SHIPMENT_STATE_MISMATCH]: "Order/Shipment Mismatch",
            [AlertKey.SHIPMENT_EXCEPTION]: "Manual Exception",
            [AlertKey.TRADE_DOC_REQUIRED_MISSING]: "Missing Document",
            [AlertKey.TRADE_DOC_REJECTED]: "Document Rejected",
            [AlertKey.TRACKING_DELAY_DETECTED]: "Shipment Delay",
        };
        return map[alertKey] ?? "Manual Exception";
    }
    normalizeSeverity(s) {
        if (s === "CRITICAL")
            return "Critical";
        if (s === "WARNING")
            return "Medium";
        return "High";
    }
    defaultOwnerRole(alertKey) {
        if (alertKey.includes("PAYMENT") || alertKey.includes("PO"))
            return "Finance";
        if (alertKey.includes("SHIPMENT") || alertKey.includes("TRACKING"))
            return "Logistics";
        if (alertKey.includes("DOC"))
            return "Document Controller";
        return "Operations";
    }
}
//# sourceMappingURL=exception-engine.service.js.map