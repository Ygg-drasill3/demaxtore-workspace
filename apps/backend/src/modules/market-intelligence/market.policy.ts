import { AppError } from "../../utils/httpErrors.js";

export type MarketAuthUser = { id: string; role: string; email: string };

export function assertMarketAccess(user: MarketAuthUser | undefined): void {
  if (!user) throw new AppError(401, "UNAUTHORIZED");
  if (user.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
}
