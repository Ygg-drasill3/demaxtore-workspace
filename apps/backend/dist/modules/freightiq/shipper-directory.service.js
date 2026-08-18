import { AppError } from "../../utils/httpErrors.js";
export class ShipperDirectoryService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(search) {
        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { scacCode: { contains: search, mode: "insensitive" } },
                    { country: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};
        const [items, total] = await Promise.all([
            this.db.freightShipper.findMany({
                where,
                orderBy: { name: "asc" },
                take: 200,
            }),
            this.db.freightShipper.count({ where }),
        ]);
        return { items: items.map(mapShipper), total };
    }
    async create(input) {
        const existing = await this.db.freightShipper.findFirst({
            where: { name: { equals: input.name.trim(), mode: "insensitive" } },
        });
        if (existing)
            throw new AppError(409, "SHIPPER_ALREADY_EXISTS");
        const row = await this.db.freightShipper.create({
            data: {
                name: input.name.trim(),
                scacCode: input.scacCode?.trim() || null,
                country: input.country?.trim() || null,
                notes: input.notes?.trim() || null,
            },
        });
        return mapShipper(row);
    }
    async remove(id) {
        const row = await this.db.freightShipper.findUnique({ where: { id } });
        if (!row)
            throw new AppError(404, "SHIPPER_NOT_FOUND");
        await this.db.freightShipper.delete({ where: { id } });
    }
}
function mapShipper(r) {
    return {
        id: r.id,
        name: r.name,
        scacCode: r.scacCode,
        country: r.country,
        notes: r.notes,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
    };
}
//# sourceMappingURL=shipper-directory.service.js.map