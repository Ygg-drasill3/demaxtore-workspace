import type { Request, Response } from "express";
import {
  AssignOperationalTaskSchema,
  CreateOperationalTaskCommentSchema,
  CreateOperationalTaskSchema,
  ListOperationalTasksQuerySchema,
  PatchOperationalTaskSchema,
} from "@dmx/contracts/operational-task.zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { OperationalTaskService } from "./operational-task.service.js";

const service = new OperationalTaskService(prisma);

function actor(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED");
  return {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  };
}

export const operationalTaskController = {
  async list(req: Request, res: Response) {
    const query = ListOperationalTasksQuerySchema.parse(req.query);
    res.json(await service.list(actor(req), query));
  },

  async summary(req: Request, res: Response) {
    res.json(await service.summary(actor(req)));
  },

  async get(req: Request, res: Response) {
    res.json(await service.get(req.params.id, actor(req)));
  },

  async create(req: Request, res: Response) {
    const input = CreateOperationalTaskSchema.parse(req.body);
    res.status(201).json(await service.create(actor(req), input));
  },

  async patch(req: Request, res: Response) {
    const input = PatchOperationalTaskSchema.parse(req.body);
    res.json(await service.patch(req.params.id, actor(req), input));
  },

  async assign(req: Request, res: Response) {
    const input = AssignOperationalTaskSchema.parse(req.body);
    res.json(await service.assign(req.params.id, actor(req), input));
  },

  async start(req: Request, res: Response) {
    res.json(await service.start(req.params.id, actor(req)));
  },

  async complete(req: Request, res: Response) {
    res.json(await service.complete(req.params.id, actor(req)));
  },

  async cancel(req: Request, res: Response) {
    res.json(await service.cancel(req.params.id, actor(req)));
  },

  async softDelete(req: Request, res: Response) {
    res.json(await service.softDelete(req.params.id, actor(req)));
  },

  async listComments(req: Request, res: Response) {
    res.json(await service.listComments(req.params.id, actor(req)));
  },

  async addComment(req: Request, res: Response) {
    const input = CreateOperationalTaskCommentSchema.parse(req.body);
    res.status(201).json(await service.addComment(req.params.id, actor(req), input));
  },

  async deleteComment(req: Request, res: Response) {
    res.json(await service.deleteComment(req.params.id, req.params.commentId, actor(req)));
  },

  async listForOrder(req: Request, res: Response) {
    const query = ListOperationalTasksQuerySchema.parse({
      ...req.query,
      orderId: req.params.id,
      pageSize: req.query.pageSize ?? 50,
    });
    res.json(await service.list(actor(req), query));
  },
};
