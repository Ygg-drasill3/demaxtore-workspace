import { CreateOperationalIssueSchema, ListOperationalIssuesQuerySchema, PatchOperationalIssueSchema, ResolveOperationalIssueSchema, } from "@dmx/contracts/operational-issue.zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { OperationalIssueService } from "./operational-issue.service.js";
const service = new OperationalIssueService(prisma);
function actor(req) {
    if (!req.user)
        throw new AppError(401, "UNAUTHORIZED");
    return {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
    };
}
export const operationalIssueController = {
    async list(req, res) {
        const query = ListOperationalIssuesQuerySchema.parse(req.query);
        res.json(await service.list(actor(req), query));
    },
    async summary(req, res) {
        res.json(await service.summary(actor(req)));
    },
    async get(req, res) {
        res.json(await service.get(req.params.id, actor(req)));
    },
    async create(req, res) {
        const input = CreateOperationalIssueSchema.parse(req.body);
        res.status(201).json(await service.create(actor(req), input));
    },
    async patch(req, res) {
        const input = PatchOperationalIssueSchema.parse(req.body);
        res.json(await service.patch(req.params.id, actor(req), input));
    },
    async resolve(req, res) {
        const input = ResolveOperationalIssueSchema.parse(req.body ?? {});
        res.json(await service.resolve(req.params.id, actor(req), input));
    },
    async reopen(req, res) {
        res.json(await service.reopen(req.params.id, actor(req)));
    },
    async softDelete(req, res) {
        res.json(await service.softDelete(req.params.id, actor(req)));
    },
    async listForOrder(req, res) {
        const query = ListOperationalIssuesQuerySchema.parse({
            ...req.query,
            orderId: req.params.id,
            pageSize: req.query.pageSize ?? 50,
        });
        res.json(await service.list(actor(req), query));
    },
};
//# sourceMappingURL=operational-issue.controller.js.map