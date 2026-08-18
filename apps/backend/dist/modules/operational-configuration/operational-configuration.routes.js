import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import { PatchAutomationRuleSchema, PatchMilestoneTemplateSchema, PatchTaskTemplateSchema, UpdateOperationalConfigurationSchema, UpsertMilestoneTemplateSchema, UpsertTaskTemplateSchema, } from "@dmx/contracts/operational-configuration.zod";
import { OperationalConfigurationService } from "./operational-configuration.service.js";
const svc = new OperationalConfigurationService(prisma);
function actor(req) {
    return {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
    };
}
export const operationalConfigurationRouter = Router();
operationalConfigurationRouter.get("/configuration", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.getConfiguration(actor(req)));
}));
operationalConfigurationRouter.patch("/configuration", requireAuth, asyncHandler(async (req, res) => {
    const body = UpdateOperationalConfigurationSchema.parse(req.body ?? {});
    res.json(await svc.updateConfiguration(actor(req), body));
}));
operationalConfigurationRouter.get("/automation", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.listAutomation(actor(req)));
}));
operationalConfigurationRouter.patch("/automation/:id", requireAuth, asyncHandler(async (req, res) => {
    const body = PatchAutomationRuleSchema.parse(req.body ?? {});
    res.json(await svc.patchAutomation(actor(req), req.params.id, body));
}));
operationalConfigurationRouter.get("/templates/tasks", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.listTaskTemplates(actor(req)));
}));
operationalConfigurationRouter.post("/templates/tasks", requireAuth, asyncHandler(async (req, res) => {
    const body = UpsertTaskTemplateSchema.parse(req.body ?? {});
    res.status(201).json(await svc.createTaskTemplate(actor(req), body));
}));
operationalConfigurationRouter.patch("/templates/tasks/:id", requireAuth, asyncHandler(async (req, res) => {
    const body = PatchTaskTemplateSchema.parse(req.body ?? {});
    res.json(await svc.patchTaskTemplate(actor(req), req.params.id, body));
}));
operationalConfigurationRouter.get("/templates/milestones", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.listMilestoneTemplates(actor(req)));
}));
operationalConfigurationRouter.post("/templates/milestones", requireAuth, asyncHandler(async (req, res) => {
    const body = UpsertMilestoneTemplateSchema.parse(req.body ?? {});
    res.status(201).json(await svc.createMilestoneTemplate(actor(req), body));
}));
operationalConfigurationRouter.patch("/templates/milestones/:id", requireAuth, asyncHandler(async (req, res) => {
    const body = PatchMilestoneTemplateSchema.parse(req.body ?? {});
    res.json(await svc.patchMilestoneTemplate(actor(req), req.params.id, body));
}));
operationalConfigurationRouter.get("/configuration/audits", requireAuth, asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(await svc.listAudits(actor(req), Number.isFinite(limit) ? limit : 50));
}));
//# sourceMappingURL=operational-configuration.routes.js.map