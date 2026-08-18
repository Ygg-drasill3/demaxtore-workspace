import { BulkContainerExecutionService } from "./bulk-container-execution.service.js";
import { prisma } from "../../db/prisma.js";
const service = new BulkContainerExecutionService(prisma);
function actor(req) {
    return req.user;
}
export const bulkContainerExecutionController = {
    spawn: async (req, res) => {
        res.json(await service.spawnExecutionOrders(req.params.id, actor(req)));
    },
    getExecution: async (req, res) => {
        res.json(await service.getExecution(req.params.id, actor(req)));
    },
};
//# sourceMappingURL=bulk-container-execution.controller.js.map