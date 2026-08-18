export async function logReferenceFreightAudit(db, input) {
    await db.referenceFreightRateAudit.create({
        data: {
            rateId: input.rateId,
            action: input.action,
            actorUserId: input.actorUserId,
            snapshot: input.snapshot,
        },
    });
}
//# sourceMappingURL=reference-freight-audit.js.map