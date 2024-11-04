import { createClient, type ResultSet, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../../env";
import * as schema from "./schema";
import { type SQLiteTransaction } from "drizzle-orm/sqlite-core";
import { type ExtractTablesWithRelations } from "drizzle-orm";

export const runtime = "edge";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: Client | undefined;
};

export const client =
  globalForDb.client ??
  createClient({
    url: env.DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });

export type Transaction =
  | SQLiteTransaction<
      "async",
      ResultSet,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >
  | typeof db;
