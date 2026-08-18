import { Prisma, type PrismaClient, type Role } from "@prisma/client";
import {
  OPERATIONAL_TASK_AUTOMATION_KEYS,
  type OperationalTaskActorDto,
  type OperationalTaskCommentDto,
  type OperationalTaskDto,
  type OperationalTaskListResponse,
  type OperationalTaskPermissions,
  type OperationalTaskPriority,
  type OperationalTaskRelatedType,
  type OperationalTaskStatus,
  type OperationalTaskSummaryCounts,
} from "@dmx/contracts/operational-task";
import type {
  AssignOperationalTaskInput,
  CreateOperationalTaskCommentInput,
  CreateOperationalTaskInput,
  ListOperationalTasksQuery,
  PatchOperationalTaskInput,
} from "@dmx/contracts/operational-task.zod";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { canAccessOrder } from "../order/order.policy.js";

type Actor = { id: string; email: string; role: Role; displayName?: string };

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000001";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  return new Date(v);
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfTodayUtc(): Date {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function computeTaskPermissions(role: Role, opts: {
  isAssignee: boolean;
  isAuthor: boolean;
}): OperationalTaskPermissions {
  const manager =
    isPlatformAdminRole(role)
    || role === "OPS_MANAGER"
    || role === "ADMIN"
    || role === "DOCUMENT_CONTROLLER"
    || role === "SALES_CONTROL";
  const partnerRole =
    role === "SUPPLIER"
    || role === "ORIGIN_AGENT"
    || role === "CUSTOMS_BROKER"
    || role === "TRUCKER";
  const progress =
    manager
    || opts.isAssignee
    || role === "LOGISTICS_OPERATOR"
    || role === "BUYER"
    || (partnerRole && opts.isAssignee);
  return {
    canView: true,
    canCreate: manager || role === "BUYER" || role === "LOGISTICS_OPERATOR",
    canAssign: manager,
    canUpdateProgress: progress,
    canComplete: progress,
    canComment: progress || partnerRole,
    canCancel: manager || opts.isAuthor,
  };
}

export class OperationalTaskService {
  constructor(private readonly prisma: PrismaClient) {}

  private async assertOrderAccess(actor: Actor, orderId: string) {
    // Checked before the role bypass below, otherwise a privileged actor asking for an
    // order that does not exist got an empty list instead of a 404.
    const order = await this.prisma.workspace.findFirst({
      where: { id: orderId, type: "ORDER" },
      select: { id: true },
    });
    if (!order) throw new AppError(404, "ORDER_NOT_FOUND");
    if (
      isPlatformAdminRole(actor.role)
      || actor.role === "OPS_MANAGER"
      || actor.role === "LOGISTICS_OPERATOR"
      || actor.role === "DOCUMENT_CONTROLLER"
      || actor.role === "SALES_CONTROL"
    ) {
      return;
    }
    const ok = await canAccessOrder(this.prisma, actor, orderId);
    if (!ok) throw new AppError(403, "FORBIDDEN");
  }

  private async writeTimeline(
    orderId: string,
    actor: Actor,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const actorUserId = actor.id || SYSTEM_ACTOR_ID;
    // TimelineEvent.actorUserId FKs to User — omit system sentinel if not a real user row.
    const timelineActorId = actorUserId === SYSTEM_ACTOR_ID ? null : actorUserId;
    await this.prisma.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType,
        actorUserId: timelineActorId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId: orderId,
        actorUserId,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: eventType,
        fromState: String(payload.fromStatus ?? ""),
        toState: String(payload.toStatus ?? payload.status ?? ""),
        payload: payload as Prisma.InputJsonValue,
      },
    });
    socketBus.emitToWorkspace(orderId, "task.updated", {
      workspaceId: orderId,
      taskId: payload.taskId,
      eventType,
      occurredAt: new Date().toISOString(),
    });
  }

  private async loadUsers(ids: string[]): Promise<Map<string, OperationalTaskActorDto>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true, email: true },
    });
    return new Map(
      rows.map((u) => [u.id, { id: u.id, name: u.displayName, email: u.email }]),
    );
  }

  private toDto(
    row: {
      id: string;
      orderId: string;
      purchaseOrderId: string | null;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: Date | null;
      assignedToId: string | null;
      createdById: string;
      completedAt: Date | null;
      completedById: string | null;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      automationKey: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count?: { comments: number };
    },
    users: Map<string, OperationalTaskActorDto>,
    actor: Actor,
  ): OperationalTaskDto {
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    const fallback: OperationalTaskActorDto = { id: row.createdById, name: "Unknown", email: null };
    return {
      id: row.id,
      orderId: row.orderId,
      purchaseOrderId: row.purchaseOrderId,
      title: row.title,
      description: row.description,
      status: row.status as OperationalTaskStatus,
      priority: row.priority as OperationalTaskPriority,
      dueDate: iso(row.dueDate),
      assignedTo: row.assignedToId ? users.get(row.assignedToId) ?? { id: row.assignedToId, name: "User" } : null,
      createdBy: users.get(row.createdById) ?? fallback,
      completedAt: iso(row.completedAt),
      completedBy: row.completedById
        ? users.get(row.completedById) ?? { id: row.completedById, name: "User" }
        : null,
      relatedEntityType: (row.relatedEntityType as OperationalTaskRelatedType | null) ?? null,
      relatedEntityId: row.relatedEntityId,
      automationKey: row.automationKey,
      commentCount: row._count?.comments ?? 0,
      permissions: perms,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(actor: Actor, query: ListOperationalTasksQuery): Promise<OperationalTaskListResponse> {
    const where: Prisma.OperationalTaskWhereInput = { deletedAt: null };
    if (query.orderId) {
      await this.assertOrderAccess(actor, query.orderId);
      where.orderId = query.orderId;
    } else if (
      !isPlatformAdminRole(actor.role)
      && actor.role !== "OPS_MANAGER"
      && actor.role !== "LOGISTICS_OPERATOR"
      && actor.role !== "DOCUMENT_CONTROLLER"
      && actor.role !== "SALES_CONTROL"
    ) {
      const parts = await this.prisma.workspaceParticipant.findMany({
        where: { userId: actor.id, leftAt: null },
        select: { workspaceId: true },
      });
      where.orderId = { in: parts.map((p) => p.workspaceId) };
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.mine) where.assignedToId = actor.id;
    if (query.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] };
    }
    if (query.dueToday) {
      where.dueDate = { gte: startOfTodayUtc(), lt: endOfTodayUtc() };
      where.status = { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] };
    }
    if (query.q?.trim()) {
      where.title = { contains: query.q.trim(), mode: "insensitive" };
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, rows] = await Promise.all([
      this.prisma.operationalTask.count({ where }),
      this.prisma.operationalTask.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { comments: { where: { deletedAt: null } } } } },
      }),
    ]);

    const users = await this.loadUsers(
      rows.flatMap((r) => [r.assignedToId, r.createdById, r.completedById].filter(Boolean) as string[]),
    );
    return {
      items: rows.map((r) => this.toDto(r, users, actor)),
      page,
      pageSize,
      total,
    };
  }

  async summary(actor: Actor): Promise<OperationalTaskSummaryCounts> {
    const mineFilter =
      isPlatformAdminRole(actor.role)
      || actor.role === "OPS_MANAGER"
      || actor.role === "LOGISTICS_OPERATOR"
      || actor.role === "DOCUMENT_CONTROLLER"
        ? {}
        : {
            orderId: {
              in: (
                await this.prisma.workspaceParticipant.findMany({
                  where: { userId: actor.id, leftAt: null },
                  select: { workspaceId: true },
                })
              ).map((p) => p.workspaceId),
            },
          };

    const openStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS"] as const;
    const base = { deletedAt: null, ...mineFilter };
    const [open, overdue, dueToday, mine, highPriority, completedToday] = await Promise.all([
      this.prisma.operationalTask.count({
        where: { ...base, status: { in: [...openStatuses] } },
      }),
      this.prisma.operationalTask.count({
        where: { ...base, status: { in: [...openStatuses] }, dueDate: { lt: new Date() } },
      }),
      this.prisma.operationalTask.count({
        where: {
          ...base,
          status: { in: [...openStatuses] },
          dueDate: { gte: startOfTodayUtc(), lt: endOfTodayUtc() },
        },
      }),
      this.prisma.operationalTask.count({
        where: { ...base, assignedToId: actor.id, status: { in: [...openStatuses] } },
      }),
      this.prisma.operationalTask.count({
        where: {
          ...base,
          status: { in: [...openStatuses] },
          priority: { in: ["HIGH", "CRITICAL"] },
        },
      }),
      this.prisma.operationalTask.count({
        where: {
          ...base,
          status: "COMPLETED",
          completedAt: { gte: startOfTodayUtc(), lt: endOfTodayUtc() },
        },
      }),
    ]);
    return { open, overdue, dueToday, mine, highPriority, completedToday };
  }

  async get(id: string, actor: Actor): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { comments: { where: { deletedAt: null } } } } },
    });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const users = await this.loadUsers(
      [row.assignedToId, row.createdById, row.completedById].filter(Boolean) as string[],
    );
    return this.toDto(row, users, actor);
  }

  async create(actor: Actor, input: CreateOperationalTaskInput): Promise<OperationalTaskDto> {
    await this.assertOrderAccess(actor, input.orderId);
    const perms = computeTaskPermissions(actor.role, { isAssignee: false, isAuthor: true });
    if (!perms.canCreate) throw new AppError(403, "FORBIDDEN");

    const order = await this.prisma.workspace.findUnique({
      where: { id: input.orderId },
      select: { id: true, type: true },
    });
    if (!order || order.type !== "ORDER") throw new AppError(404, "ORDER_NOT_FOUND");

    let purchaseOrderId = input.purchaseOrderId ?? null;
    if (!purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { orderId: input.orderId },
        select: { id: true },
      });
      purchaseOrderId = po?.id ?? null;
    }

    const status = input.assignedToId ? "ASSIGNED" : "OPEN";
    const row = await this.prisma.operationalTask.create({
      data: {
        orderId: input.orderId,
        purchaseOrderId,
        title: input.title.trim(),
        description: input.description ?? null,
        priority: input.priority ?? "MEDIUM",
        dueDate: parseDate(input.dueDate),
        assignedToId: input.assignedToId ?? null,
        createdById: actor.id,
        status,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
      },
      include: { _count: { select: { comments: true } } },
    });

    await this.writeTimeline(input.orderId, actor, "task.created", {
      taskId: row.id,
      title: row.title,
      status: row.status,
    });
    if (row.assignedToId) {
      await this.writeTimeline(input.orderId, actor, "task.assigned", {
        taskId: row.id,
        assignedToId: row.assignedToId,
        status: row.status,
      });
    }
    return this.get(row.id, actor);
  }

  async patch(id: string, actor: Actor, input: PatchOperationalTaskInput): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canUpdateProgress && !perms.canAssign) throw new AppError(403, "FORBIDDEN");
    if (row.status === "COMPLETED" || row.status === "CANCELLED") {
      throw new AppError(409, "TASK_TERMINAL");
    }

    const updated = await this.prisma.operationalTask.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description === undefined ? undefined : input.description,
        priority: input.priority,
        dueDate: input.dueDate === undefined ? undefined : parseDate(input.dueDate),
        status: input.status,
        relatedEntityType: input.relatedEntityType === undefined ? undefined : input.relatedEntityType,
        relatedEntityId: input.relatedEntityId === undefined ? undefined : input.relatedEntityId,
      },
    });
    await this.writeTimeline(row.orderId, actor, "task.updated", {
      taskId: id,
      fromStatus: row.status,
      toStatus: updated.status,
    });
    return this.get(id, actor);
  }

  async assign(id: string, actor: Actor, input: AssignOperationalTaskInput): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canAssign) throw new AppError(403, "FORBIDDEN");
    if (row.status === "COMPLETED" || row.status === "CANCELLED") {
      throw new AppError(409, "TASK_TERMINAL");
    }

    const status = input.assignedToId ? "ASSIGNED" : "OPEN";
    await this.prisma.operationalTask.update({
      where: { id },
      data: { assignedToId: input.assignedToId, status },
    });
    await this.writeTimeline(row.orderId, actor, "task.assigned", {
      taskId: id,
      assignedToId: input.assignedToId,
      fromStatus: row.status,
      toStatus: status,
    });
    return this.get(id, actor);
  }

  async start(id: string, actor: Actor): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canUpdateProgress) throw new AppError(403, "FORBIDDEN");
    if (!["OPEN", "ASSIGNED"].includes(row.status)) throw new AppError(409, "TASK_NOT_STARTABLE");

    await this.prisma.operationalTask.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        assignedToId: row.assignedToId ?? actor.id,
      },
    });
    await this.writeTimeline(row.orderId, actor, "task.started", {
      taskId: id,
      fromStatus: row.status,
      toStatus: "IN_PROGRESS",
    });
    return this.get(id, actor);
  }

  async complete(id: string, actor: Actor): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canComplete) throw new AppError(403, "FORBIDDEN");
    if (row.status === "COMPLETED" || row.status === "CANCELLED") {
      throw new AppError(409, "TASK_TERMINAL");
    }

    await this.prisma.operationalTask.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: actor.id,
      },
    });
    await this.writeTimeline(row.orderId, actor, "task.completed", {
      taskId: id,
      fromStatus: row.status,
      toStatus: "COMPLETED",
    });
    // SPR-30-05 — linked issues get resolution suggested (never auto-closed)
    void import("../operational-issue/operational-issue.service.js")
      .then(({ OperationalIssueService }) =>
        new OperationalIssueService(this.prisma).suggestResolutionFromTask(id, actor),
      )
      .catch(() => undefined);
    return this.get(id, actor);
  }

  async cancel(id: string, actor: Actor): Promise<OperationalTaskDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canCancel) throw new AppError(403, "FORBIDDEN");
    if (row.status === "COMPLETED" || row.status === "CANCELLED") {
      throw new AppError(409, "TASK_TERMINAL");
    }

    await this.prisma.operationalTask.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await this.writeTimeline(row.orderId, actor, "task.cancelled", {
      taskId: id,
      fromStatus: row.status,
      toStatus: "CANCELLED",
    });
    return this.get(id, actor);
  }

  async softDelete(id: string, actor: Actor): Promise<{ deleted: true }> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    if (!isPlatformAdminRole(actor.role) && actor.role !== "OPS_MANAGER") {
      throw new AppError(403, "FORBIDDEN");
    }
    await this.prisma.operationalTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.writeTimeline(row.orderId, actor, "task.deleted", { taskId: id });
    return { deleted: true };
  }

  async listComments(id: string, actor: Actor): Promise<OperationalTaskCommentDto[]> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const comments = await this.prisma.operationalTaskComment.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    const users = await this.loadUsers(comments.map((c) => c.authorId));
    return comments.map((c) => ({
      id: c.id,
      author: users.get(c.authorId) ?? { id: c.authorId, name: "User" },
      message: c.message,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async addComment(
    id: string,
    actor: Actor,
    input: CreateOperationalTaskCommentInput,
  ): Promise<OperationalTaskCommentDto> {
    const row = await this.prisma.operationalTask.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const perms = computeTaskPermissions(actor.role, {
      isAssignee: row.assignedToId === actor.id,
      isAuthor: row.createdById === actor.id,
    });
    if (!perms.canComment) throw new AppError(403, "FORBIDDEN");

    const comment = await this.prisma.operationalTaskComment.create({
      data: { taskId: id, authorId: actor.id, message: input.message.trim() },
    });
    await this.writeTimeline(row.orderId, actor, "task.commented", {
      taskId: id,
      commentId: comment.id,
    });
    return {
      id: comment.id,
      author: { id: actor.id, name: actor.email, email: actor.email },
      message: comment.message,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async deleteComment(taskId: string, commentId: string, actor: Actor) {
    const row = await this.prisma.operationalTask.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!row) throw new AppError(404, "TASK_NOT_FOUND");
    await this.assertOrderAccess(actor, row.orderId);
    const comment = await this.prisma.operationalTaskComment.findFirst({
      where: { id: commentId, taskId, deletedAt: null },
    });
    if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND");
    if (comment.authorId !== actor.id && !isPlatformAdminRole(actor.role)) {
      throw new AppError(403, "FORBIDDEN");
    }
    await this.prisma.operationalTaskComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /** Idempotent automation helper — safe to call from FSM side effects. */
  async ensureAutomatedTask(input: {
    orderId: string;
    automationKey: string;
    title: string;
    description?: string;
    priority?: OperationalTaskPriority;
    relatedEntityType?: OperationalTaskRelatedType;
    relatedEntityId?: string | null;
    dueInDays?: number;
    actorUserId?: string;
  }): Promise<{ id: string; created: boolean }> {
    const existing = await this.prisma.operationalTask.findFirst({
      where: {
        orderId: input.orderId,
        automationKey: input.automationKey,
        deletedAt: null,
      },
    });
    if (existing) return { id: existing.id, created: false };

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { orderId: input.orderId },
      select: { id: true },
    });
    const dueDate =
      input.dueInDays != null
        ? new Date(Date.now() + input.dueInDays * 86_400_000)
        : null;
    const createdById = input.actorUserId ?? SYSTEM_ACTOR_ID;

    try {
      const row = await this.prisma.operationalTask.create({
        data: {
          orderId: input.orderId,
          purchaseOrderId: po?.id ?? null,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "MEDIUM",
          dueDate,
          createdById,
          status: "OPEN",
          relatedEntityType: input.relatedEntityType ?? null,
          relatedEntityId: input.relatedEntityId ?? null,
          automationKey: input.automationKey,
        },
      });
      await this.writeTimeline(
        input.orderId,
        { id: createdById, email: "system@demaxtore.local", role: "ADMIN" },
        "task.created",
        {
          taskId: row.id,
          title: row.title,
          automationKey: input.automationKey,
          status: row.status,
        },
      );
      return { id: row.id, created: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await this.prisma.operationalTask.findFirst({
          where: { orderId: input.orderId, automationKey: input.automationKey },
        });
        return { id: again!.id, created: false };
      }
      throw e;
    }
  }
}

export { OPERATIONAL_TASK_AUTOMATION_KEYS };
