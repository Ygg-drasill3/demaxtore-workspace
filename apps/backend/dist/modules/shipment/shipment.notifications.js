export async function resolveRecipients(_tx, transition, workspace, actor) {
    const out = [];
    const ref = workspace.externalRef;
    const owner = workspace.createdById;
    const counterparties = workspace.participants
        .filter((p) => p.participantRole === "COUNTERPARTY")
        .map((p) => p.userId);
    const all = Array.from(new Set(workspace.participants.map((p) => p.userId)));
    for (const spec of transition.notifyRecipients) {
        const meta = { title: `Shipment · ${ref}`, message: `Shipment ${ref} — ${transition.auditEvent}` };
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
    }
    return out;
}
//# sourceMappingURL=shipment.notifications.js.map