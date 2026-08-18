import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { exceptionHubController } from "./exception-hub.controller.js";
const router = Router();
router.get("/", requireAuth, exceptionHubController.list);
router.get("/:id", requireAuth, exceptionHubController.detail);
router.post("/:id/assign", requireAuth, exceptionHubController.assign);
router.post("/:id/resolve", requireAuth, exceptionHubController.resolve);
router.post("/:id/close", requireAuth, exceptionHubController.close);
export default router;
//# sourceMappingURL=exception-hub.routes.js.map