/** Load ledger rows and join offers in a second query — skips orphan FK rows safely. */
export async function findLedgerWithOffers(db, args) {
    const ledgerRows = await db.freightRevenueLedger.findMany({
        where: args.where,
        take: args.take,
        orderBy: args.orderBy,
    });
    if (!ledgerRows.length)
        return [];
    const offers = await db.freightOffer.findMany({
        where: { id: { in: ledgerRows.map((r) => r.freightOfferId) } },
        include: args.offerInclude,
    });
    const offerById = new Map(offers.map((o) => [o.id, o]));
    return ledgerRows.flatMap((row) => {
        const offer = offerById.get(row.freightOfferId);
        if (!offer)
            return [];
        return [{ ...row, offer }];
    });
}
/** Remove ledger rows whose freight offer no longer exists (e.g. after test workspace cleanup). */
export async function purgeOrphanFreightLedger(db) {
    const result = await db.$executeRaw `
    DELETE FROM freight_revenue_ledger l
    WHERE NOT EXISTS (
      SELECT 1 FROM freight_offers o WHERE o.id = l.freight_offer_id
    )
  `;
    return Number(result);
}
//# sourceMappingURL=freight-ledger.query.js.map