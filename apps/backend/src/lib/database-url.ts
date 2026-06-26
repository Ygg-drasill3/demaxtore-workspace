import { env } from "../config/env.js";

/**
 * Merges Prisma pool hints into DATABASE_URL (Sprint 9B).
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
 */
export function buildDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const limit = String(env.DATABASE_CONNECTION_LIMIT);
  const timeout = String(env.DATABASE_POOL_TIMEOUT_SEC);
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", limit);
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", timeout);
  }
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", "10");
  }
  return url.toString();
}
