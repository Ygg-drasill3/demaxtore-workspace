import { AppError } from "../../utils/httpErrors.js";
export class ForwarderDirectoryService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(search) {
        const where = search
            ? {
                OR: [
                    { companyName: { contains: search, mode: "insensitive" } },
                    { contactName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};
        const [items, total] = await Promise.all([
            this.db.forwarderContact.findMany({
                where,
                orderBy: { companyName: "asc" },
                take: 100,
            }),
            this.db.forwarderContact.count({ where }),
        ]);
        return { items: items.map(mapForwarder), total };
    }
    async get(id) {
        const row = await this.db.forwarderContact.findUnique({ where: { id } });
        if (!row)
            throw new AppError(404, "FORWARDER_NOT_FOUND");
        return mapForwarder(row);
    }
    async create(input) {
        const row = await this.db.forwarderContact.create({
            data: {
                companyName: input.companyName,
                contactName: input.contactName,
                email: input.email,
                phone: input.phone,
                country: input.country,
                notes: input.notes,
            },
        });
        return mapForwarder(row);
    }
    async update(id, input) {
        await this.get(id);
        const row = await this.db.forwarderContact.update({
            where: { id },
            data: {
                companyName: input.companyName,
                contactName: input.contactName,
                email: input.email,
                phone: input.phone,
                country: input.country,
                notes: input.notes,
                active: input.active,
            },
        });
        return mapForwarder(row);
    }
    async deactivate(id) {
        return this.update(id, { active: false });
    }
}
function mapForwarder(r) {
    return {
        id: r.id,
        companyName: r.companyName,
        contactName: r.contactName,
        email: r.email,
        phone: r.phone,
        country: r.country,
        notes: r.notes,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
    };
}
//# sourceMappingURL=forwarder-directory.service.js.map