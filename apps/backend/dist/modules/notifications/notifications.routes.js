// apps/backend/src/modules/notifications/notifications.routes.ts
import { Router } from "express";
import * as c from "./notifications.controller.js";
const router = Router();
router.get("/preferences", ...c.getPreferences);
router.put("/preferences", ...c.putPreferences);
router.get("/", ...c.list);
router.get("/unread-count", ...c.unreadCount);
router.post("/read-all", ...c.markAllRead);
router.post("/:id/read", ...c.markRead);
router.post("/:id/archive", ...c.archive);
router.post("/:id/dismiss", ...c.dismiss);
router.post("/:id/snooze", ...c.snooze);
export default router;
//# sourceMappingURL=notifications.routes.js.map