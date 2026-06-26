// apps/backend/src/modules/notifications/notifications.routes.ts
import { Router } from "express";
import * as c from "./notifications.controller.js";

const router = Router();

router.get   ("/",            ...c.list);
router.get   ("/unread-count", ...c.unreadCount);
router.post  ("/read-all",    ...c.markAllRead);
router.post  ("/:id/read",    ...c.markRead);

export default router;
