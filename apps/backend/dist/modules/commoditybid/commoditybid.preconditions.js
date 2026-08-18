import { AppError } from "../../utils/httpErrors.js";
import { LotInput } from "@dmx/contracts/commoditybid.zod";
const MAX_DEADLINE_EXTENSIONS = 2;
const MAX_DEADLINE_EXTENSION_DAYS = 14;
function lots(ws) {
    return ws.commodityBidLots ?? [];
}
function invitations(ws) {
    return ws.commodityBidInvitations ?? [];
}
function submissions(ws) {
    return ws.commodityBidSubmissions ?? [];
}
function awards(ws) {
    return ws.commodityBidAwards ?? [];
}
export const PRECONDITIONS = {
    assertLotFieldsValid: ({ workspace, payload }) => {
        const parsed = LotInput.safeParse(payload);
        if (!parsed.success)
            throw new AppError(400, "COMMODITYBID_LOT_INVALID", { issues: parsed.error.flatten() });
        if (!workspace.currency)
            throw new AppError(400, "COMMODITYBID_NO_CURRENCY");
    },
    assertLotBelongsToWorkspace: ({ workspace, payload }) => {
        const lotId = payload.lotId;
        if (lotId && !lots(workspace).some((l) => l.id === lotId))
            throw new AppError(404, "LOT_NOT_FOUND");
    },
    assertAtLeastOneLotRemains: ({ workspace }) => {
        if (lots(workspace).length <= 1)
            throw new AppError(400, "COMMODITYBID_LAST_LOT");
    },
    assertSubmitBidPreconditions: ({ workspace }) => {
        if (!lots(workspace).length)
            throw new AppError(400, "COMMODITYBID_NO_LOTS");
        if (!workspace.deadlineAt || new Date(workspace.deadlineAt) <= new Date())
            throw new AppError(400, "COMMODITYBID_DEADLINE_PAST");
        if (!workspace.currency)
            throw new AppError(400, "COMMODITYBID_NO_CURRENCY");
    },
    assertAtLeastOneSupplier: ({ payload }) => {
        const ids = payload.supplierUserIds ?? [];
        if (!ids.length)
            throw new AppError(400, "COMMODITYBID_NO_SUPPLIERS");
    },
    assertNotYetTriaged: ({ workspace }) => {
        if (workspace.state !== "BID_SUBMITTED")
            throw new AppError(409, "COMMODITYBID_ALREADY_TRIAGED");
    },
    assertAtLeastOneFieldChanged: () => { },
    assertSupplierNew: ({ workspace, payload }) => {
        const existing = new Set(invitations(workspace).filter((i) => !i.removedAt).map((i) => i.supplierUserId));
        const incoming = payload.supplierUserIds ?? [];
        if (incoming.some((id) => existing.has(id)))
            throw new AppError(409, "COMMODITYBID_SUPPLIER_EXISTS");
    },
    assertSupplierHasNoBid: ({ workspace, payload }) => {
        const sid = payload.supplierUserId;
        if (submissions(workspace).some((b) => b.supplierUserId === sid && !b.withdrawnAt))
            throw new AppError(409, "COMMODITYBID_SUPPLIER_HAS_BID");
    },
    assertAtLeastOneSupplierInvited: ({ workspace }) => {
        if (!invitations(workspace).filter((i) => !i.removedAt).length)
            throw new AppError(400, "COMMODITYBID_NO_SUPPLIERS_INVITED");
    },
    assertFutureDeadline: ({ workspace }) => {
        if (!workspace.deadlineAt || new Date(workspace.deadlineAt) <= new Date())
            throw new AppError(400, "COMMODITYBID_DEADLINE_PAST");
    },
    assertNoExistingBidFromSupplierOnLot: ({ workspace, payload, actor }) => {
        const lotId = payload.lotId;
        if (submissions(workspace).some((b) => b.lotId === lotId && b.supplierUserId === actor.id && !b.withdrawnAt))
            throw new AppError(409, "COMMODITYBID_BID_EXISTS");
    },
    assertExistingBidFromSupplierOnLot: ({ workspace, payload, actor }) => {
        const lotId = payload.lotId;
        if (!submissions(workspace).some((b) => b.lotId === lotId && b.supplierUserId === actor.id && !b.withdrawnAt))
            throw new AppError(404, "COMMODITYBID_NO_BID");
    },
    assertBidCurrencyMatchesWorkspace: ({ workspace, payload }) => {
        if (payload.currency && payload.currency !== workspace.currency)
            throw new AppError(400, "COMMODITYBID_CURRENCY_MISMATCH");
    },
    assertDeadlineNotPassed: ({ workspace }) => {
        if (workspace.deadlineAt && new Date(workspace.deadlineAt) < new Date())
            throw new AppError(409, "COMMODITYBID_DEADLINE_PASSED");
    },
    assertDeadlineExtensionAllowed: ({ workspace, payload }) => {
        const count = workspace.deadlineExtensionCount ?? 0;
        if (count >= MAX_DEADLINE_EXTENSIONS)
            throw new AppError(409, "COMMODITYBID_DEADLINE_EXTENSION_LIMIT");
        const newDeadline = new Date(payload.newDeadline);
        const old = new Date(workspace.deadlineAt);
        const addedDays = Math.ceil((newDeadline.getTime() - old.getTime()) / 86400_000);
        const total = (workspace.deadlineExtensionTotalDays ?? 0) + addedDays;
        if (total > MAX_DEADLINE_EXTENSION_DAYS)
            throw new AppError(409, "COMMODITYBID_DEADLINE_EXTENSION_DAYS_LIMIT");
    },
    assertHasBids: ({ workspace }) => {
        if (!submissions(workspace).some((b) => !b.withdrawnAt))
            throw new AppError(409, "COMMODITYBID_NO_BIDS");
    },
    assertNoBids: ({ workspace }) => {
        if (submissions(workspace).some((b) => !b.withdrawnAt))
            throw new AppError(409, "COMMODITYBID_HAS_BIDS");
    },
    assertNewDeadline: ({ payload }) => {
        if (!payload.newDeadline || new Date(payload.newDeadline) <= new Date())
            throw new AppError(400, "COMMODITYBID_DEADLINE_PAST");
    },
    assertBidNotWithdrawn: ({ workspace, payload }) => {
        const sub = submissions(workspace).find((b) => b.id === payload.submissionId);
        if (!sub || sub.withdrawnAt)
            throw new AppError(409, "COMMODITYBID_BID_WITHDRAWN");
    },
    assertBidValidityNotExpired: ({ workspace, payload }) => {
        const sub = submissions(workspace).find((b) => b.id === payload.submissionId);
        if (sub && new Date(sub.validUntil) < new Date())
            throw new AppError(409, "COMMODITYBID_BID_EXPIRED");
    },
    assertAllLotsDecided: ({ workspace }) => {
        for (const lot of lots(workspace)) {
            const hasNoAward = !!lot.noAwardReason;
            const hasDraft = awards(workspace).some((a) => a.lotId === lot.id && a.status === "DRAFT");
            if (!hasNoAward && !hasDraft)
                throw new AppError(409, "COMMODITYBID_LOT_UNDECIDED", { lotId: lot.id });
        }
    },
    assertPublishedAwardForSupplierOnLot: ({ workspace, payload, actor }) => {
        const ok = awards(workspace).some((a) => a.lotId === payload.lotId && a.supplierUserId === actor.id && a.status === "PUBLISHED");
        if (!ok)
            throw new AppError(404, "COMMODITYBID_AWARD_NOT_FOUND");
    },
    assertAwardNotYetAccepted: ({ workspace, payload, actor }) => {
        const lotId = payload.lotId;
        const award = awards(workspace).find((a) => a.lotId === lotId && a.supplierUserId === actor.id);
        if (award?.status === "ACCEPTED")
            throw new AppError(409, "COMMODITYBID_AWARD_ALREADY_ACCEPTED");
    },
    assertPreviousAwardTerminal: ({ workspace, payload }) => {
        const lotId = payload.lotId;
        const terminal = new Set(["DECLINED", "WITHDRAWN", "EXPIRED", "RE_AWARDED"]);
        const blocking = awards(workspace).find((a) => a.lotId === lotId && (a.status === "PUBLISHED" || a.status === "ACCEPTED"));
        if (blocking)
            throw new AppError(409, "COMMODITYBID_PRIOR_AWARD_NOT_TERMINAL", { lotId });
        const stale = awards(workspace).find((a) => a.lotId === lotId && !terminal.has(a.status) && a.status !== "DRAFT");
        if (stale)
            throw new AppError(409, "COMMODITYBID_PRIOR_AWARD_NOT_TERMINAL", { lotId });
    },
    assertEligibleReplacementBid: ({ workspace, payload }) => {
        const submissionId = payload.submissionId;
        const lotId = payload.lotId;
        const sub = submissions(workspace).find((s) => s.id === submissionId);
        if (!sub || sub.withdrawnAt)
            throw new AppError(404, "COMMODITYBID_REPLACEMENT_BID_NOT_FOUND");
        if (sub.lotId !== lotId)
            throw new AppError(400, "COMMODITYBID_BID_LOT_MISMATCH");
        if (new Date(sub.validUntil) < new Date())
            throw new AppError(409, "COMMODITYBID_BID_EXPIRED");
        const declined = awards(workspace).find((a) => a.lotId === lotId && ["DECLINED", "WITHDRAWN", "EXPIRED"].includes(a.status));
        if (!declined)
            throw new AppError(409, "COMMODITYBID_NO_TERMINAL_AWARD_FOR_REAWARD");
        const sameSupplier = awards(workspace).find((a) => a.lotId === lotId && a.supplierUserId === sub.supplierUserId && a.status !== "RE_AWARDED");
        if (sameSupplier?.supplierUserId === sub.supplierUserId)
            throw new AppError(409, "COMMODITYBID_SAME_SUPPLIER_REAWARD");
    },
    assertAllAwardsTerminal: ({ workspace }) => {
        if (awards(workspace).some((a) => a.status === "PUBLISHED"))
            throw new AppError(409, "COMMODITYBID_AWARDS_STILL_PENDING");
        const terminal = new Set(["ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN", "RE_AWARDED"]);
        for (const lot of lots(workspace)) {
            if (lot.noAwardReason)
                continue;
            if (!awards(workspace).some((a) => a.lotId === lot.id && terminal.has(a.status)))
                throw new AppError(409, "COMMODITYBID_LOT_AWARD_NOT_TERMINAL", { lotId: lot.id });
        }
    },
    assertAtLeastOneAcceptedAward: ({ workspace }) => {
        if (!awards(workspace).some((a) => a.status === "ACCEPTED"))
            throw new AppError(409, "COMMODITYBID_NO_ACCEPTED_AWARDS");
    },
    assertContractNumbersUnique: ({ payload }) => {
        const refs = payload.contractRefs;
        if (!refs)
            return;
        const values = Object.values(refs).filter(Boolean);
        if (new Set(values).size !== values.length)
            throw new AppError(400, "COMMODITYBID_DUPLICATE_CONTRACT_REFS");
    },
    // Sprint 9B — auction engine
    assertScheduleAuctionPreconditions: ({ workspace, payload }) => {
        if (!lots(workspace).length)
            throw new AppError(400, "COMMODITYBID_NO_LOTS");
        if (!workspace.currency)
            throw new AppError(400, "COMMODITYBID_NO_CURRENCY");
        const starts = new Date(payload.auctionStartsAt);
        if (starts <= new Date())
            throw new AppError(400, "AUCTION_START_PAST");
        const ids = payload.supplierUserIds ?? [];
        if (!ids.length)
            throw new AppError(400, "COMMODITYBID_NO_SUPPLIERS");
        const dur = Number(payload.auctionDurationMinutes ?? 30);
        if (dur < 1 || dur > 120)
            throw new AppError(400, "AUCTION_DURATION_INVALID");
    },
    assertInvitedSupplier: ({ workspace, actor }) => {
        const inv = invitations(workspace).find((i) => i.supplierUserId === actor.id && !i.removedAt);
        if (!inv)
            throw new AppError(403, "NOT_INVITED");
    },
    assertBidImprovesLowest: ({ workspace, payload, actor }) => {
        const lotId = payload.lotId;
        const price = Number(payload.unitPrice);
        const others = submissions(workspace).filter((b) => b.lotId === lotId && !b.withdrawnAt && b.supplierUserId !== actor.id);
        if (!others.length)
            return;
        const lowestPrice = Math.min(...others.map((b) => Number(b.unitPrice ?? Infinity)));
        if (price >= lowestPrice)
            throw new AppError(409, "BID_NOT_LOWER");
    },
    assertHasValidWinner: ({ workspace }) => {
        const active = submissions(workspace).filter((b) => !b.withdrawnAt);
        if (!active.length)
            throw new AppError(409, "COMMODITYBID_NO_BIDS");
    },
    assertWinnerAwardReady: ({ workspace }) => {
        if (!awards(workspace).some((a) => a.status === "ACCEPTED"))
            throw new AppError(409, "COMMODITYBID_NO_ACCEPTED_AWARDS");
    },
    assertActiveFreightEstimate: ({ workspace }) => {
        const rows = workspace.freightEstimates ?? [];
        if (rows.length === 0) {
            throw new AppError(409, "FREIGHT_ESTIMATE_REQUIRED", {
                message: "An active FreightIQ estimate is required before Purchase Order approval.",
            });
        }
    },
};
//# sourceMappingURL=commoditybid.preconditions.js.map