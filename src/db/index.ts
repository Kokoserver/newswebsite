import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/src/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const maximumConnections = Number.parseInt(
  process.env.DATABASE_MAX_CONNECTIONS ?? "10",
  10,
);

if (!Number.isFinite(maximumConnections) || maximumConnections < 1) {
  throw new Error("DATABASE_MAX_CONNECTIONS must be a positive integer");
}

type DatabaseConnection = ReturnType<typeof postgres>;

const globalForDatabase = globalThis as unknown as {
  databaseConnection?: DatabaseConnection;
};

const connection =
  globalForDatabase.databaseConnection ??
  postgres(databaseUrl, {
    max: maximumConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databaseConnection = connection;
}

export const db = drizzle(connection, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export { connection };
