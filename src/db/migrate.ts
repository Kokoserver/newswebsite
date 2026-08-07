import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const databaseConnectionUrl = databaseUrl;

async function runMigrations() {
  const connection = postgres(databaseConnectionUrl, {
    max: 1,
    prepare: false,
  });

  const database = drizzle(connection);

  try {
    console.log("Applying database migrations...");

    await migrate(database, {
      migrationsFolder: "./drizzle",
    });

    console.log("Database migrations completed");
  } catch (error) {
    console.error("Database migration failed", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

void runMigrations();
