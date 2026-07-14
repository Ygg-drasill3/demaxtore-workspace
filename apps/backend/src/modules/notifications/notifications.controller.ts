// apps/backend/src/modules/notifications/notifications.controller.ts
import type { NotificationCategory } from "@dmx/contracts/notification-center";
import { ListNotificationsQuery, NotificationPreferences, SnoozeNotificationBody } from "@dmx/contracts";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as svc from "./notifications.service.js";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "../notification-engine/notification-preferences.store.js";

export const list = [
  requireAuth,
  validateQuery(ListNotificationsQuery),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      category: NotificationCategory;
      unreadOnly: boolean;
      limit: number;
      cursor?: string;
    };
    const result = await svc.list({
      userId:     req.user!.id,
      category:   q.category,
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

export const archive = [
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await svc.archive(req.user!.id, req.params.id));
  }),
];

export const dismiss = [
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await svc.dismiss(req.user!.id, req.params.id));
  }),
];

export const snooze = [
  requireAuth,
  validateBody(SnoozeNotificationBody),
  asyncHandler(async (req, res) => {
    const body = req.body as { option: string };
    res.json(await svc.snooze(req.user!.id, req.params.id, body.option));
  }),
];

export const getPreferences = [
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getNotificationPreferences(req.user!.id));
  }),
];

export const putPreferences = [
  requireAuth,
  validateBody(NotificationPreferences),
  asyncHandler(async (req, res) => {
    const body = req.body as NotificationPreferences;
    res.json(await saveNotificationPreferences(req.user!.id, body));
  }),
];
