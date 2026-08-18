import { AssignInspectorSchema, CreateInspectionDefectSchema, CreateInspectionFindingSchema, CreateInspectionNcrSchema, PatchInspectionDefectSchema, PatchInspectionFindingSchema, PatchInspectionNcrSchema, PatchInspectionWorkspaceSchema, RecordInspectionDecisionSchema, ScheduleInspectionSchema, } from "@dmx/contracts/inspection-workspace.zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { InspectionService } from "./inspection.service.js";
const service = new InspectionService(prisma);
function actor(req) {
    if (!req.user)
        throw new AppError(401, "UNAUTHORIZED");
    return { id: req.user.id, email: req.user.email, role: req.user.role };
}
export const inspectionController = {
    async get(req, res) {
        const dto = await service.get(req.params.id, actor(req));
        res.json(dto);
    },
    async listForOrder(req, res) {
        const items = await service.listForOrder(req.params.id, actor(req));
        res.json(items);
    },
    async patch(req, res) {
        const input = PatchInspectionWorkspaceSchema.parse(req.body);
        const dto = await service.patch(req.params.id, actor(req), input);
        res.json(dto);
    },
    async cancel(req, res) {
        const dto = await service.cancelRequest(req.params.id, actor(req));
        res.json(dto);
    },
    async assign(req, res) {
        const input = AssignInspectorSchema.parse(req.body);
        const dto = await service.assign(req.params.id, actor(req), input);
        res.json(dto);
    },
    async removeAssignment(req, res) {
        const dto = await service.removeAssignment(req.params.id, actor(req));
        res.json(dto);
    },
    async schedule(req, res) {
        const input = ScheduleInspectionSchema.parse(req.body);
        const dto = await service.schedule(req.params.id, actor(req), input);
        res.json(dto);
    },
    async addFinding(req, res) {
        const input = CreateInspectionFindingSchema.parse(req.body);
        const dto = await service.addFinding(req.params.id, actor(req), input);
        res.json(dto);
    },
    async patchFinding(req, res) {
        const input = PatchInspectionFindingSchema.parse(req.body);
        const dto = await service.patchFinding(req.params.id, req.params.findingId, actor(req), input);
        res.json(dto);
    },
    async deleteFinding(req, res) {
        const dto = await service.deleteFinding(req.params.id, req.params.findingId, actor(req));
        res.json(dto);
    },
    async addDefect(req, res) {
        const input = CreateInspectionDefectSchema.parse(req.body);
        const dto = await service.addDefect(req.params.id, actor(req), input);
        res.json(dto);
    },
    async patchDefect(req, res) {
        const input = PatchInspectionDefectSchema.parse(req.body);
        const dto = await service.patchDefect(req.params.id, req.params.defectId, actor(req), input);
        res.json(dto);
    },
    async deleteDefect(req, res) {
        const dto = await service.deleteDefect(req.params.id, req.params.defectId, actor(req));
        res.json(dto);
    },
    async addNcr(req, res) {
        const input = CreateInspectionNcrSchema.parse(req.body);
        const dto = await service.addNcr(req.params.id, actor(req), input);
        res.json(dto);
    },
    async patchNcr(req, res) {
        const input = PatchInspectionNcrSchema.parse(req.body);
        const dto = await service.patchNcr(req.params.id, req.params.ncrId, actor(req), input);
        res.json(dto);
    },
    async decision(req, res) {
        const input = RecordInspectionDecisionSchema.parse(req.body);
        const dto = await service.recordDecision(req.params.id, actor(req), input);
        res.json(dto);
    },
    async timeline(req, res) {
        const events = await service.timeline(req.params.id, actor(req));
        res.json(events);
    },
};
//# sourceMappingURL=inspection.controller.js.map