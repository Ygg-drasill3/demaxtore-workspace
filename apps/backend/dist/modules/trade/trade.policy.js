import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { collectTradeGraph, resolveTradeRoot } from "./trade.resolver.js";
export async function canAccessTrade(db, user, workspaceId) {
    if (hasPortfolioVisibility(user.role))
        return true;
    const root = await resolveTradeRoot(db, workspaceId);
    if (!root)
        return false;
    const graph = await collectTradeGraph(db, root);
    const participation = await db.workspaceParticipant.findFirst({
        where: {
            userId: user.id,
            workspaceId: { in: graph.allWorkspaceIds },
            leftAt: null,
        },
        select: { id: true },
    });
    return !!participation;
}
//# sourceMappingURL=trade.policy.js.map