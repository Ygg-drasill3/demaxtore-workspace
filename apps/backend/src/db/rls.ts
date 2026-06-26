import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Set PostgreSQL session variable for RLS policies on commoditybid_submissions. */
export async function withRlsUser<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx);
  });
}
