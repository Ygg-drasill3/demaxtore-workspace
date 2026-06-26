import { AppError } from "../../utils/httpErrors.js";

export type SystemAuthUser = { id: string; role: string; email: string };

export function assertSystemAccess(user: SystemAuthUser | undefined): void {
  if (!user) throw new AppError(401, "UNAUTHORIZED");
  if (user.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
}
