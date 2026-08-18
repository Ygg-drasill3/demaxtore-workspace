import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "./config.mjs";

let client;

export function getPrisma() {
  if (!client) {
    client = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  }
  return client;
}

export async function disconnectPrisma() {
  if (client) await client.$disconnect();
}
