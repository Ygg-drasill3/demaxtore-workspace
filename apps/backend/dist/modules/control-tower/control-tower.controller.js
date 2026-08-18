import { ListAlertsQuery, ResolveAlertBody } from "@dmx/contracts/control-tower.zod";
import { ImportControlTowerQuerySchema } from "@dmx/contracts/import-control-tower.zod";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { ControlTowerService } from "./control-tower.service.js";
import { ControlTowerAggregator } from "./control-tower-aggregator.js";
import { canAccessImportControlTower } from "./control-tower.policy.js";
import { TrackingService } from "../tracking/tracking.service.js";
import { isValidE2eBypass } from "../../middleware/e2e-bypass.js";
const service = new ControlTowerService(prisma);
const aggregator = new ControlTowerAggregator(prisma);
const trackingService = new TrackingService(prisma);
export const controlTowerController = {
    importDashboard: async (req, res) => {
        if (!req.user || !canAccessImportControlTower(req.user)) {
            throw new AppError(403, "FORBIDDEN");
        }
        const query = ImportControlTowerQuerySchema.parse(req.query);
        res.json(await aggregator.buildDashboard(req.user, query));
    },
    overview: async (_req, res) => {
        res.json(await service.getOverview());
    },
    alerts: async (req, res) => {
        const query = ListAlertsQuery.parse(req.query);
        const includeTestData = isValidE2eBypass(req) ||
            (req.user?.role === "ADMIN" && req.query.includeTestData === "true");
        res.json(await service.listAlerts(query, { includeTestData }));
    },
    alertById: async (req, res) => {
        res.json(await service.getAlert(req.params.id));
    },
    resolveAlert: async (req, res) => {
        const body = ResolveAlertBody.parse(req.body ?? {});
        res.json(await service.resolveAlert(req.params.id, req.user, body));
    },
    metrics: async (_req, res) => {
        res.json(await service.getMetrics());
    },
    sla: async (_req, res) => {
        res.json(await service.getSla());
    },
    supplierPerformance: async (_req, res) => {
        res.json(await service.getSupplierPerformance());
    },
    buyerPerformance: async (_req, res) => {
        res.json(await service.getBuyerPerformance());
    },
    /** Manual alert-engine refresh (admin ops / E2E). */
    scan: async (req, res) => {
        const created = await service.runAlertScan({ preserveTestWorkspaces: isValidE2eBypass(req) });
        res.json({ created });
    },
    shipmentTracking: async (_req, res) => {
        res.json(await trackingService.getOpsSummary());
    },
    dashboard: async (_req, res) => {
        res.json(await service.getDashboard());
    },
};
//# sourceMappingURL=control-tower.controller.js.map