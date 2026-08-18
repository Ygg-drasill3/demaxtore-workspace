import { AssignAccountOwnershipPayload } from "@dmx/contracts/scale-readiness.zod";
import { AppError } from "../../utils/httpErrors.js";
export class ScaleAccountService {
    db;
    constructor(db) {
        this.db = db;
    }
    async mapOwner(orgId, orgName) {
        const row = await this.db.accountOwnership.findUnique({
            where: { organisationId: orgId },
            include: {
                operationsUser: { select: { id: true, displayName: true } },
                salesUser: { select: { id: true, displayName: true } },
            },
        });
        if (!row)
            return null;
        return {
            organisationId: orgId,
            organisationName: orgName,
            operationsUserId: row.operationsUserId,
            operationsUserName: row.operationsUser?.displayName ?? null,
            salesUserId: row.salesUserId,
            salesUserName: row.salesUser?.displayName ?? null,
        };
    }
    async assignOwnership(organisationId, actor, raw, ctx) {
        const input = AssignAccountOwnershipPayload.parse(raw);
        const org = await this.db.organisation.findUnique({ where: { id: organisationId } });
        if (!org)
            throw new AppError(404, "ORG_NOT_FOUND");
        if (input.operationsUserId)
            await this.assertAdminUser(input.operationsUserId);
        if (input.salesUserId)
            await this.assertAdminUser(input.salesUserId);
        const existing = await this.db.accountOwnership.findUnique({ where: { organisationId } });
        const action = existing ? "account.reassigned" : "account.assigned";
        const row = await this.db.$transaction(async (tx) => {
            const saved = await tx.accountOwnership.upsert({
                where: { organisationId },
                create: {
                    organisationId,
                    operationsUserId: input.operationsUserId ?? null,
                    salesUserId: input.salesUserId ?? null,
                },
                update: {
                    operationsUserId: input.operationsUserId ?? null,
                    salesUserId: input.salesUserId ?? null,
                },
                include: {
                    operationsUser: { select: { id: true, displayName: true } },
                    salesUser: { select: { id: true, displayName: true } },
                },
            });
            const anchor = await tx.workspace.findFirst({
                where: { type: "ORDER" },
                orderBy: { createdAt: "asc" },
                select: { id: true, state: true },
            });
            if (anchor) {
                await tx.auditLog.create({
                    data: {
                        workspaceId: anchor.id,
                        actorUserId: actor.id,
                        actorEmail: actor.email,
                        actorRole: actor.role,
                        action,
                        fromState: anchor.state,
                        toState: anchor.state,
                        payload: {
                            organisationId,
                            operationsUserId: input.operationsUserId,
                            salesUserId: input.salesUserId,
                        },
                        ipAddress: ctx?.ip,
                        userAgent: ctx?.userAgent,
                    },
                });
            }
            return saved;
        });
        return {
            organisationId,
            organisationName: org.name,
            operationsUserId: row.operationsUserId,
            operationsUserName: row.operationsUser?.displayName ?? null,
            salesUserId: row.salesUserId,
            salesUserName: row.salesUser?.displayName ?? null,
        };
    }
    async assertAdminUser(userId) {
        const u = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (!u || u.role !== "ADMIN")
            throw new AppError(400, "INVALID_ACCOUNT_OWNER");
    }
}
//# sourceMappingURL=scale-account.service.js.map