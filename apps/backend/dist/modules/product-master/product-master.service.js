import { AppError } from "../../utils/httpErrors.js";
import { assertProductAccess, canBrowseProducts, canManageProducts, isProductMasterDeniedRole, resolveActorOrganisationId, } from "./product-master.policy.js";
function dec(n) {
    if (n == null)
        return null;
    return Number(n);
}
function mapProduct(row) {
    return {
        id: row.id,
        organisationId: row.organisationId,
        sku: row.sku,
        name: row.name,
        description: row.description,
        customsDescription: row.customsDescription,
        manufacturer: row.manufacturer,
        brand: row.brand,
        model: row.model,
        unitOfMeasure: row.unitOfMeasure,
        netWeight: dec(row.netWeight),
        grossWeight: dec(row.grossWeight),
        weightUnit: row.weightUnit,
        length: dec(row.length),
        width: dec(row.width),
        height: dec(row.height),
        dimensionUnit: row.dimensionUnit,
        countryOfOrigin: row.countryOfOrigin,
        gtipCode: row.gtipCode,
        classificationStatus: row.classificationStatus,
        classificationSource: row.classificationSource,
        classificationNotes: row.classificationNotes,
        classificationUpdatedAt: row.classificationUpdatedAt?.toISOString() ?? null,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        supplierReferences: (row.supplierReferences ?? []).map((r) => ({
            id: r.id,
            productId: r.productId,
            supplierUserId: r.supplierUserId,
            supplierSku: r.supplierSku,
            notes: r.notes,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        })),
    };
}
function normalizeSku(sku) {
    return sku.trim().toUpperCase();
}
/**
 * Entering a GTİP code never auto-VERIFIES.
 * Create/patch: if code present and status omitted → CANDIDATE + USER_ENTERED.
 */
function resolveClassificationOnWrite(input) {
    const code = input.gtipCode?.trim() || null;
    let status = input.classificationStatus ?? (code ? "CANDIDATE" : "UNCLASSIFIED");
    // Never silently upgrade to VERIFIED from mere code entry
    if (status === "VERIFIED" && input.classificationSource !== "CUSTOMS_BROKER_VERIFIED") {
        // Explicit VERIFIED without broker provenance → treat as CANDIDATE (safe)
        status = "CANDIDATE";
    }
    if (!code && status !== "UNCLASSIFIED" && !input.classificationStatus) {
        status = "UNCLASSIFIED";
    }
    const source = input.classificationSource ??
        (code ? "USER_ENTERED" : null);
    return { classificationStatus: status, classificationSource: source };
}
export class ProductMasterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    denyIfPartner(user) {
        if (isProductMasterDeniedRole(user) || !canBrowseProducts(user)) {
            throw new AppError(403, "PRODUCT_MASTER_FORBIDDEN");
        }
    }
    async list(user, query) {
        this.denyIfPartner(user);
        const orgId = await resolveActorOrganisationId(this.prisma, user);
        if (!orgId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
            throw new AppError(403, "ORGANISATION_REQUIRED");
        }
        const where = {
            ...(orgId && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"
                ? { organisationId: orgId }
                : orgId
                    ? { organisationId: orgId }
                    : {}),
            status: query.status ?? "ACTIVE",
            ...(query.countryOfOrigin ? { countryOfOrigin: query.countryOfOrigin } : {}),
            ...(query.classificationStatus
                ? { classificationStatus: query.classificationStatus }
                : {}),
            ...(query.supplierUserId
                ? { supplierReferences: { some: { supplierUserId: query.supplierUserId } } }
                : {}),
            ...(query.q
                ? {
                    OR: [
                        { sku: { contains: query.q, mode: "insensitive" } },
                        { name: { contains: query.q, mode: "insensitive" } },
                        { description: { contains: query.q, mode: "insensitive" } },
                        { manufacturer: { contains: query.q, mode: "insensitive" } },
                        { model: { contains: query.q, mode: "insensitive" } },
                        { gtipCode: { contains: query.q, mode: "insensitive" } },
                        {
                            supplierReferences: {
                                some: { supplierSku: { contains: query.q, mode: "insensitive" } },
                            },
                        },
                    ],
                }
                : {}),
        };
        const [totalItems, rows] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                include: { supplierReferences: true },
                orderBy: [{ updatedAt: "desc" }],
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
        ]);
        return {
            items: rows.map(mapProduct),
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
            },
        };
    }
    async get(user, id) {
        this.denyIfPartner(user);
        await assertProductAccess(this.prisma, user, id);
        const row = await this.prisma.product.findUniqueOrThrow({
            where: { id },
            include: { supplierReferences: true },
        });
        return mapProduct(row);
    }
    async create(user, input) {
        this.denyIfPartner(user);
        if (!canManageProducts(user))
            throw new AppError(403, "PRODUCT_MASTER_FORBIDDEN");
        const orgId = await resolveActorOrganisationId(this.prisma, user, input.organisationId);
        if (!orgId)
            throw new AppError(400, "ORGANISATION_REQUIRED");
        const sku = normalizeSku(input.sku);
        const existing = await this.prisma.product.findUnique({
            where: { organisationId_sku: { organisationId: orgId, sku } },
            select: { id: true },
        });
        if (existing)
            throw new AppError(409, "PRODUCT_SKU_EXISTS");
        const classification = resolveClassificationOnWrite({
            gtipCode: input.gtipCode,
            classificationStatus: input.classificationStatus,
            classificationSource: input.classificationSource,
        });
        const row = await this.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    organisationId: orgId,
                    sku,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    customsDescription: input.customsDescription?.trim() || null,
                    manufacturer: input.manufacturer?.trim() || null,
                    brand: input.brand?.trim() || null,
                    model: input.model?.trim() || null,
                    unitOfMeasure: (input.unitOfMeasure || "PCS").trim().toUpperCase(),
                    netWeight: input.netWeight ?? null,
                    grossWeight: input.grossWeight ?? null,
                    weightUnit: input.weightUnit?.trim() || "KG",
                    length: input.length ?? null,
                    width: input.width ?? null,
                    height: input.height ?? null,
                    dimensionUnit: input.dimensionUnit?.trim() || "CM",
                    countryOfOrigin: input.countryOfOrigin?.trim() || null,
                    gtipCode: input.gtipCode?.trim() || null,
                    classificationStatus: classification.classificationStatus,
                    classificationSource: classification.classificationSource,
                    classificationNotes: input.classificationNotes?.trim() || null,
                    classificationUpdatedAt: input.gtipCode || input.classificationStatus ? new Date() : null,
                    classificationUpdatedById: input.gtipCode || input.classificationStatus ? user.id : null,
                    createdById: user.id,
                    updatedById: user.id,
                },
            });
            if (input.supplierUserId) {
                const supplier = await tx.user.findUnique({
                    where: { id: input.supplierUserId },
                    select: { id: true, role: true },
                });
                if (!supplier || supplier.role !== "SUPPLIER") {
                    throw new AppError(404, "SUPPLIER_NOT_FOUND");
                }
                await tx.productSupplierReference.create({
                    data: {
                        productId: created.id,
                        supplierUserId: input.supplierUserId,
                        supplierSku: input.supplierSku?.trim() || null,
                    },
                });
            }
            await tx.productChangeEvent.create({
                data: {
                    productId: created.id,
                    actorUserId: user.id,
                    field: "created",
                    fromValue: null,
                    toValue: sku,
                    reason: "Product created",
                },
            });
            return tx.product.findUniqueOrThrow({
                where: { id: created.id },
                include: { supplierReferences: true },
            });
        });
        return mapProduct(row);
    }
    async update(user, id, input) {
        this.denyIfPartner(user);
        if (!canManageProducts(user))
            throw new AppError(403, "PRODUCT_MASTER_FORBIDDEN");
        await assertProductAccess(this.prisma, user, id);
        const before = await this.prisma.product.findUniqueOrThrow({ where: { id } });
        const nextSku = input.sku != null ? normalizeSku(input.sku) : before.sku;
        if (nextSku !== before.sku) {
            const clash = await this.prisma.product.findUnique({
                where: {
                    organisationId_sku: { organisationId: before.organisationId, sku: nextSku },
                },
                select: { id: true },
            });
            if (clash && clash.id !== id)
                throw new AppError(409, "PRODUCT_SKU_EXISTS");
        }
        const classification = resolveClassificationOnWrite({
            gtipCode: input.gtipCode !== undefined ? input.gtipCode : before.gtipCode,
            classificationStatus: input.classificationStatus ?? before.classificationStatus,
            classificationSource: input.classificationSource !== undefined
                ? input.classificationSource
                : before.classificationSource,
        });
        const tracked = [];
        const push = (field, from, to) => {
            const a = from == null ? null : String(from);
            const b = to == null ? null : String(to);
            if (a !== b)
                tracked.push({ field, from: a, to: b });
        };
        const row = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id },
                data: {
                    sku: nextSku,
                    name: input.name?.trim() ?? undefined,
                    description: input.description !== undefined ? input.description?.trim() || null : undefined,
                    customsDescription: input.customsDescription !== undefined
                        ? input.customsDescription?.trim() || null
                        : undefined,
                    manufacturer: input.manufacturer !== undefined ? input.manufacturer?.trim() || null : undefined,
                    brand: input.brand !== undefined ? input.brand?.trim() || null : undefined,
                    model: input.model !== undefined ? input.model?.trim() || null : undefined,
                    unitOfMeasure: input.unitOfMeasure
                        ? input.unitOfMeasure.trim().toUpperCase()
                        : undefined,
                    netWeight: input.netWeight !== undefined ? input.netWeight : undefined,
                    grossWeight: input.grossWeight !== undefined ? input.grossWeight : undefined,
                    weightUnit: input.weightUnit !== undefined ? input.weightUnit?.trim() || null : undefined,
                    length: input.length !== undefined ? input.length : undefined,
                    width: input.width !== undefined ? input.width : undefined,
                    height: input.height !== undefined ? input.height : undefined,
                    dimensionUnit: input.dimensionUnit !== undefined ? input.dimensionUnit?.trim() || null : undefined,
                    countryOfOrigin: input.countryOfOrigin !== undefined
                        ? input.countryOfOrigin?.trim() || null
                        : undefined,
                    gtipCode: input.gtipCode !== undefined ? input.gtipCode?.trim() || null : undefined,
                    classificationStatus: classification.classificationStatus,
                    classificationSource: classification.classificationSource,
                    classificationNotes: input.classificationNotes !== undefined
                        ? input.classificationNotes?.trim() || null
                        : undefined,
                    classificationUpdatedAt: input.gtipCode !== undefined ||
                        input.classificationStatus !== undefined ||
                        input.classificationSource !== undefined
                        ? new Date()
                        : undefined,
                    classificationUpdatedById: input.gtipCode !== undefined ||
                        input.classificationStatus !== undefined ||
                        input.classificationSource !== undefined
                        ? user.id
                        : undefined,
                    status: input.status,
                    updatedById: user.id,
                },
                include: { supplierReferences: true },
            });
            push("sku", before.sku, updated.sku);
            push("name", before.name, updated.name);
            push("countryOfOrigin", before.countryOfOrigin, updated.countryOfOrigin);
            push("gtipCode", before.gtipCode, updated.gtipCode);
            push("classificationStatus", before.classificationStatus, updated.classificationStatus);
            push("classificationSource", before.classificationSource, updated.classificationSource);
            for (const t of tracked) {
                await tx.productChangeEvent.create({
                    data: {
                        productId: id,
                        actorUserId: user.id,
                        field: t.field,
                        fromValue: t.from,
                        toValue: t.to,
                        reason: input.reason?.trim() || null,
                    },
                });
            }
            return updated;
        });
        return mapProduct(row);
    }
    async upsertSupplierReference(user, productId, input) {
        this.denyIfPartner(user);
        if (!canManageProducts(user))
            throw new AppError(403, "PRODUCT_MASTER_FORBIDDEN");
        await assertProductAccess(this.prisma, user, productId);
        const supplier = await this.prisma.user.findUnique({
            where: { id: input.supplierUserId },
            select: { id: true, role: true },
        });
        if (!supplier || supplier.role !== "SUPPLIER")
            throw new AppError(404, "SUPPLIER_NOT_FOUND");
        const row = await this.prisma.productSupplierReference.upsert({
            where: {
                productId_supplierUserId: {
                    productId,
                    supplierUserId: input.supplierUserId,
                },
            },
            create: {
                productId,
                supplierUserId: input.supplierUserId,
                supplierSku: input.supplierSku?.trim() || null,
                notes: input.notes?.trim() || null,
            },
            update: {
                supplierSku: input.supplierSku !== undefined ? input.supplierSku?.trim() || null : undefined,
                notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
            },
        });
        return {
            id: row.id,
            productId: row.productId,
            supplierUserId: row.supplierUserId,
            supplierSku: row.supplierSku,
            notes: row.notes,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
    async relatedPurchaseOrders(user, productId, page = 1, pageSize = 25) {
        this.denyIfPartner(user);
        await assertProductAccess(this.prisma, user, productId);
        const where = { productId };
        const [totalItems, lines] = await Promise.all([
            this.prisma.purchaseOrderLine.count({ where }),
            this.prisma.purchaseOrderLine.findMany({
                where,
                select: {
                    id: true,
                    quantity: true,
                    sku: true,
                    description: true,
                    purchaseOrder: {
                        select: {
                            id: true,
                            poNumber: true,
                            status: true,
                            supplierId: true,
                            issuedAt: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return {
            items: lines.map((l) => ({
                purchaseOrderLineId: l.id,
                purchaseOrderId: l.purchaseOrder.id,
                poNumber: l.purchaseOrder.poNumber,
                status: l.purchaseOrder.status,
                quantity: Number(l.quantity),
                lineSku: l.sku,
                lineDescription: l.description,
                issuedAt: l.purchaseOrder.issuedAt?.toISOString() ?? null,
                createdAt: l.purchaseOrder.createdAt.toISOString(),
            })),
            pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
            },
        };
    }
    async relatedShipments(user, productId, page = 1, pageSize = 25) {
        this.denyIfPartner(user);
        await assertProductAccess(this.prisma, user, productId);
        const allocations = await this.prisma.shipmentLineAllocation.findMany({
            where: { purchaseOrderLine: { productId } },
            select: {
                id: true,
                quantity: true,
                unit: true,
                shipmentWorkspaceId: true,
                purchaseOrderLineId: true,
                purchaseOrderId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        });
        const shipmentIds = [...new Set(allocations.map((a) => a.shipmentWorkspaceId))];
        const pageIds = shipmentIds.slice((page - 1) * pageSize, page * pageSize);
        const shipments = pageIds.length === 0
            ? []
            : await this.prisma.shipmentWorkspace.findMany({
                where: { workspaceId: { in: pageIds } },
                select: {
                    workspaceId: true,
                    bookingRef: true,
                    workspace: { select: { externalRef: true, state: true } },
                },
            });
        const byId = new Map(shipments.map((s) => [s.workspaceId, s]));
        return {
            items: pageIds.map((sid) => {
                const s = byId.get(sid);
                const allocs = allocations.filter((a) => a.shipmentWorkspaceId === sid);
                return {
                    shipmentWorkspaceId: sid,
                    externalRef: s?.workspace.externalRef ?? null,
                    state: s?.workspace.state ?? null,
                    bookingReference: s?.bookingRef ?? null,
                    allocatedQuantity: allocs.reduce((sum, a) => sum + Number(a.quantity), 0),
                    allocationCount: allocs.length,
                };
            }),
            pagination: {
                page,
                pageSize,
                totalItems: shipmentIds.length,
                totalPages: Math.max(1, Math.ceil(shipmentIds.length / pageSize)),
            },
        };
    }
    /**
     * Quick-create or reuse by SKU for Direct PO. Idempotent on (org, sku).
     */
    async quickCreateOrGet(user, organisationId, input, supplierUserId) {
        const sku = normalizeSku(input.sku);
        const existing = await this.prisma.product.findUnique({
            where: { organisationId_sku: { organisationId, sku } },
            select: { id: true },
        });
        if (existing) {
            if (supplierUserId && input.supplierSku) {
                await this.prisma.productSupplierReference.upsert({
                    where: {
                        productId_supplierUserId: { productId: existing.id, supplierUserId },
                    },
                    create: {
                        productId: existing.id,
                        supplierUserId,
                        supplierSku: input.supplierSku.trim(),
                    },
                    update: { supplierSku: input.supplierSku.trim() },
                });
            }
            return existing.id;
        }
        const created = await this.create(user, {
            sku,
            name: input.name?.trim() || sku,
            description: input.description ?? null,
            unitOfMeasure: input.unitOfMeasure || "PCS",
            countryOfOrigin: input.countryOfOrigin ?? null,
            organisationId,
            supplierUserId: supplierUserId ?? undefined,
            supplierSku: input.supplierSku ?? null,
        });
        return created.id;
    }
    /**
     * Validate product belongs to buyer's organisation (cross-tenant link fail).
     */
    async assertProductForBuyerOrg(productId, buyerOrganisationId) {
        if (!buyerOrganisationId)
            throw new AppError(403, "ORGANISATION_REQUIRED");
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { organisationId: true },
        });
        if (!product)
            throw new AppError(404, "PRODUCT_NOT_FOUND");
        if (product.organisationId !== buyerOrganisationId) {
            throw new AppError(403, "PRODUCT_TENANT_MISMATCH");
        }
    }
}
export function createProductMasterService(prisma) {
    return new ProductMasterService(prisma);
}
//# sourceMappingURL=product-master.service.js.map