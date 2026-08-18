// apps/backend/src/db/prisma.ts
// Singleton PrismaClient (avoids hot-reload connection exhaustion under tsx watch).
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { buildDatabaseUrl } from "../lib/database-url.js";
export const prisma = global.__dmx_prisma__ ??
    new PrismaClient({
        log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        datasources: { db: { url: buildDatabaseUrl(env.DATABASE_URL) } },
    });
if (env.NODE_ENV !== "production")
    global.__dmx_prisma__ = prisma;
//# sourceMappingURL=prisma.js.map