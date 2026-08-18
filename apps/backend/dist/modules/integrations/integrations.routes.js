import { Router } from "express";
import { commoditybidSso } from "./commoditybid-sso.js";
import { freightiqSso } from "./freightiq-sso.js";
import { freightiqWorkspaceRfqs, freightiqWorkspaceRfqLink } from "./freightiq-workspace-rfqs.js";
import { freightiqDemoVesselOffer } from "./freightiq-demo-vessel-offer.js";
import { catalogRfqContextRouter } from "./catalog-rfq-ingest.routes.js";
import { env } from "../../config/env.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
const router = Router();
router.get("/freightiq/status", requireAuth, requireRole("ADMIN"), (_req, res) => {
    res.json({
        configured: Boolean(env.WORKSPACE_BRIDGE_SECRET),
        panelUrl: env.FREIGHTIQ_PANEL_URL,
        apiUrl: env.FREIGHTIQ_API_URL,
    });
});
router.get("/commoditybid/sso", ...commoditybidSso);
router.get("/freightiq/sso", ...freightiqSso);
router.get("/freightiq/workspace-rfqs", ...freightiqWorkspaceRfqs);
router.post("/freightiq/rfq-link", ...freightiqWorkspaceRfqLink);
router.post("/freightiq/demo-vessel-offer", ...freightiqDemoVesselOffer);
router.use(catalogRfqContextRouter);
export default router;
//# sourceMappingURL=integrations.routes.js.map