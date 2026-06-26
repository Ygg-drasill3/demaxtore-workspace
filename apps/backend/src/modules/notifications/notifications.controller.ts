// apps/backend/src/modules/notifications/notifications.controller.ts
import { ListNotificationsQuery } from "@dmx/contracts";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateQuery } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as svc from "./notifications.service.js";

export const list = [
  requireAuth,
  validateQuery(ListNotificationsQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { unreadOnly: boolean; limit: number; cursor?: string };
    const result = await svc.list({
      userId:     req.user!.id,
      unreadOnly: q.unreadOnly,
      limit:      q.limit,
      cursor:     q.cursor,
    });
    res.json(result);
  }),
];

export const markRead = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const dto = await svc.markRead(req.user!.id, req.params.id);
    res.json(dto);
  }),
];

export const markAllRead = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await svc.markAllRead(req.user!.id);
    res.json(result);
  }),
];

export const unreadCount = [
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await svc.unreadCount(req.user!.id));
  }),
];
