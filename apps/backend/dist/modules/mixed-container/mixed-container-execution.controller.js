import { MixedContainerExecutionService } from "./mixed-container-execution.service.js";
import { prisma } from "../../db/prisma.js";
const service = new MixedContainerExecutionService(prisma);
function actor(req) {
    return req.user;
}
export const mixedContainerExecutionController = {
    spawn: async (req, res) => {
        res.json(await service.spawnExecutionOrders(req.params.id, actor(req)));
    },
    getExecution: async (req, res) => {
        res.json(await service.getExecution(req.params.id, actor(req)));
    },
};
//# sourceMappingURL=mixed-container-execution.controller.js.map