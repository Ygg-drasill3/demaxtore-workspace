export async function resolveRecipients(_tx, transition, workspace, actor) {
    const out = [];
    const ref = workspace.externalRef;
    const owner = workspace.createdById;
    const counterparties = workspace.participants
        .filter((p) => p.participantRole === "COUNTERPARTY")
        .map((p) => p.userId);
    const all = Array.from(new Set(workspace.participants.map((p) => p.userId)));
    for (const spec of transition.notifyRecipients) {
        const meta = { title: titleFor(spec.titleKey, ref), message: messageFor(spec.titleKey, ref) };
        if (spec.broadcast) {
            out.push({ broadcastRole: spec.broadcast.role, notificationType: spec.type, ...meta });
            continue;
        }
        if (spec.target === "OWNER" && owner !== actor.id)
            out.push({ userId: owner, notificationType: spec.type, ...meta });
        if (spec.target === "COUNTERPARTY") {
            for (const uid of counterparties) {
                if (uid !== actor.id)
                    out.push({ userId: uid, notificationType: spec.type, ...meta });
            }
        }
        if (spec.target === "ALL_PARTICIPANTS") {
            for (const uid of all) {
                if (uid !== actor.id)
                    out.push({ userId: uid, notificationType: spec.type, ...meta });
            }
        }
        if (spec.target === "SELECTED_SUPPLIER") {
            const winnerId = workspace.commodityBidDetails?.lowestBidSupplierId ??
                workspace.commodityBidAwards?.find((a) => a.status === "WINNER" || a.status === "ACCEPTED")?.supplierUserId;
            if (winnerId && winnerId !== actor.id) {
                out.push({ userId: winnerId, notificationType: spec.type, ...meta });
            }
        }
    }
    return out;
}
function titleFor(key, ref) {
    const map = {
        "bid.submitted.admin": `CommodityBid submitted · ${ref}`,
        "bid.published": `Bid opened · ${ref}`,
        "bid.evaluation.ready": `Bids closed · ${ref}`,
        "bid.awards.published": `Awards published · ${ref}`,
    };
    return map[key] ?? `CommodityBid update · ${ref}`;
}
function messageFor(key, ref) {
    return titleFor(key, ref);
}
//# sourceMappingURL=commoditybid.notifications.js.map