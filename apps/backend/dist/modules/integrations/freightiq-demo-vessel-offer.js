import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
import { FreightIqService } from "../freightiq/freightiq.service.js";
import { FreightCommunicationsService } from "../freightiq/freight-communications.service.js";
import { ForwarderDirectoryService } from "../freightiq/forwarder-directory.service.js";
import { embedCors, readEmbedToken, verifyFreightiqEmbedListToken, } from "./freightiq-workspace-rfqs.js";
const DemoVesselOfferBody = z.object({
    workspaceRfqId: z.string().uuid(),
    price: z.number().positive(),
    currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
    transitDays: z.number().int().positive().max(365),
    vesselName: z.string().min(1).max(200),
    carrierName: z.string().min(1).max(200),
    forwarderCompanyName: z.string().min(1).max(200),
    forwarderContactName: z.string().min(1).max(200),
    forwarderEmail: z.string().email().max(320),
});
async function loadAuthUser(userId) {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
    });
    if (!row)
        throw new AppError(401, "USER_NOT_FOUND");
    return { id: row.id, email: row.email, role: row.role };
}
async function ensureForwarderContact(input) {
    const existing = await prisma.forwarderContact.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { id: true, active: true },
    });
    if (existing) {
        if (!existing.active) {
            await prisma.forwarderContact.update({
                where: { id: existing.id },
                data: { active: true },
            });
        }
        return existing.id;
    }
    const forwarders = new ForwarderDirectoryService(prisma);
    const created = await forwarders.create({
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
    });
    return created.id;
}
/** FreightIQ embed — route demo vessel offers into workspace order freight intake. */
export const freightiqDemoVesselOffer = [
    embedCors,
    asyncHandler(async (req, res) => {
        const token = readEmbedToken(req);
        if (!token) {
            res.status(401).json({ message: "Missing ws_t token" });
            return;
        }
        let actor;
        try {
            actor = verifyFreightiqEmbedListToken(token);
        }
        catch {
            res.status(401).json({ message: "Invalid or expired ws_t token" });
            return;
        }
        if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
            res.status(403).json({ message: "Admin role required" });
            return;
        }
        const body = DemoVesselOfferBody.parse(req.body ?? {});
        const wsRfq = await prisma.workspace.findFirst({
            where: { id: body.workspaceRfqId, type: "RFQ", trashedAt: null },
            select: { id: true, externalRef: true },
        });
        if (!wsRfq) {
            res.status(404).json({ message: "Workspace RFQ not found" });
            return;
        }
        const order = await prisma.workspace.findFirst({
            where: { spawnedFromId: body.workspaceRfqId, type: "ORDER", trashedAt: null },
            include: { orderWorkspace: true },
            orderBy: { createdAt: "desc" },
        });
        if (!order?.orderWorkspace) {
            res.status(404).json({
                message: "No order workspace spawned from this RFQ yet",
                workspaceRfqId: body.workspaceRfqId,
            });
            return;
        }
        const authUser = await loadAuthUser(actor.sub);
        const freightIq = new FreightIqService(prisma);
        let summary = await freightIq.getSummary(order.id);
        if (!summary.request) {
            const ow = order.orderWorkspace;
            summary = await freightIq.applyFreightAction(order.id, "create_request", authUser, {
                mode: "OCEAN_FCL",
                pol: ow.originPort || "CNSHA",
                pod: ow.destinationPort || "NLRTM",
                cargoDescription: `Demo vessel offer for ${order.externalRef ?? wsRfq.externalRef}`,
                containerType: "40HC",
            });
        }
        const forwarderContactId = await ensureForwarderContact({
            companyName: body.forwarderCompanyName,
            contactName: body.forwarderContactName,
            email: body.forwarderEmail,
        });
        const now = Date.now();
        const etd = new Date(now + 14 * 86_400_000);
        const eta = new Date(etd.getTime() + body.transitDays * 86_400_000);
        const cutOff = new Date(now + 7 * 86_400_000);
        const validUntil = new Date(now + 21 * 86_400_000);
        const comms = new FreightCommunicationsService(prisma);
        const result = await comms.intakeOffer(order.id, authUser, {
            forwarderContactId,
            offerSource: "MANUAL_ENTRY",
            carrierName: body.carrierName,
            vesselName: body.vesselName,
            etd: etd.toISOString(),
            eta: eta.toISOString(),
            transitDays: body.transitDays,
            cutOff: cutOff.toISOString(),
            oceanFreight: body.price,
            currency: body.currency,
            validUntil: validUntil.toISOString(),
            remarks: `${body.carrierName} · demo gemi teklifi`,
        }, { ip: req.ip, userAgent: req.headers["user-agent"] });
        res.status(201).json({
            orderId: order.id,
            orderExternalRef: order.externalRef,
            workspaceRfqId: body.workspaceRfqId,
            offerCount: result.offers?.length ?? 0,
            summary: result,
        });
    }),
];
//# sourceMappingURL=freightiq-demo-vessel-offer.js.map