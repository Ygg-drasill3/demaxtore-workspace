import { Router } from "express";
import * as c from "./passwordless-access.controller.js";
import { consumeBurstLimiter, passwordlessLinkLimiter } from "../../middleware/rate-limit.js";

const router = Router();

router.post("/links", passwordlessLinkLimiter, ...c.createLink);
router.post("/consume", consumeBurstLimiter, ...c.consume);

export default router;
