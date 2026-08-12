import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { ensureFileDatabaseDirectory, getDatabaseConfig } from "@/src/db/config";
import { ensureDatabaseReady } from "@/src/db/ensure-ready";
import * as schema from "@/src/db/schema";

const databaseConfig = getDatabaseConfig();
ensureFileDatabaseDirectory(databaseConfig.url);

const globalForDatabase = globalThis as unknown as {
  databaseConnection?: Client;
};

const connection =
  globalForDatabase.databaseConnection ??
  createClient({
    url: databaseConfig.url,
    authToken: databaseConfig.authToken,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databaseConnection = connection;
}

export const db = drizzle(connection, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export async function getDb() {
  await ensureDatabaseReady(db);
  return db;
}

export { connection };
