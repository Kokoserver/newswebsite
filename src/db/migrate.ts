import "dotenv/config";

import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { ensureFileDatabaseDirectory, getDatabaseConfig } from "./config";
import * as schema from "./schema";

const databaseConfig = getDatabaseConfig();
ensureFileDatabaseDirectory(databaseConfig.url);

export async function migrateDatabase(database: LibSQLDatabase<typeof schema>) {
  await migrate(database, {
    migrationsFolder: "./drizzle",
  });
}

async function runMigrations() {
  const connection = createClient({
    url: databaseConfig.url,
    authToken: databaseConfig.authToken,
  });

  const database = drizzle(connection, { schema });

  try {
    console.log("Applying database migrations...");

    await migrateDatabase(database);

    console.log("Database migrations completed");
  } catch (error) {
    console.error("Database migration failed", error);
    process.exitCode = 1;
  } finally {
    connection.close();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  void runMigrations();
}
