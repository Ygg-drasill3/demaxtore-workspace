// Sprint 9B — Automatic lowest-valid-bid winner selection
import type { Prisma } from "@prisma/client";

export interface WinnerResult {
  lotId: string;
  submissionId: string;
  supplierUserId: string;
  unitPrice: number;
}

export async function findLowestValidBids(
  tx: Prisma.TransactionClient,
  workspaceId: string,
): Promise<WinnerResult[]> {
  const lots = await tx.commodityBidLot.findMany({ where: { workspaceId } });
  const now = new Date();
  const results: WinnerResult[] = [];

  for (const lot of lots) {
    const subs = await tx.commodityBidSubmission.findMany({
      where: { lotId: lot.id, withdrawnAt: null, validUntil: { gt: now } },
      orderBy: [{ unitPrice: "asc" }, { createdAt: "asc" }],
    });
    if (subs.length === 0) continue;
    subs.sort((a, b) => {
      const price = Number(a.unitPrice) - Number(b.unitPrice);
      if (price !== 0) return price;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const winner = subs[0];
    results.push({
      lotId: lot.id,
      submissionId: winner.id,
      supplierUserId: winner.supplierUserId,
      unitPrice: Number(winner.unitPrice),
    });
  }
  return results;
}

export async function recordWinners(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  winners: WinnerResult[],
): Promise<void> {
  if (winners.length === 0) return;
  const primary = winners[0];

  await tx.commodityBidDetails.update({
    where: { workspaceId },
    data: {
      lowestBidAmount: primary.unitPrice,
      lowestBidSupplierId: primary.supplierUserId,
      winnerSubmissionId: primary.submissionId,
    },
  });

  for (const w of winners) {
    const existing = await tx.commodityBidAward.findFirst({
      where: { workspaceId, lotId: w.lotId },
    });
    if (existing) {
      await tx.commodityBidAward.update({
        where: { id: existing.id },
        data: {
          supplierUserId: w.supplierUserId,
          submissionId: w.submissionId,
          status: "WINNER",
          awardedAt: new Date(),
        },
      });
    } else {
      await tx.commodityBidAward.create({
        data: {
          workspaceId,
          lotId: w.lotId,
          supplierUserId: w.supplierUserId,
          submissionId: w.submissionId,
          status: "WINNER",
          awardedAt: new Date(),
        },
      });
    }
  }
}

export async function approveWinners(
  tx: Prisma.TransactionClient,
  workspaceId: string,
): Promise<void> {
  await tx.commodityBidAward.updateMany({
    where: { workspaceId, status: "WINNER" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
}
