import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { tradeController } from "./trade.controller.js";

const router = Router();

router.get("/:id/exceptions", requireAuth, tradeController.getExceptions);
router.get("/:id/documents", requireAuth, tradeController.getDocuments);
router.get("/:id/workspace", requireAuth, tradeController.getWorkspace);

export default router;
