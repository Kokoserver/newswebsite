import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { getDatabaseConfig, isFileDatabaseUrl } from "@/src/db/config";
import * as schema from "@/src/db/schema";

let readyPromise: Promise<void> | null = null;

function getFileDatabasePath(url: string) {
  const path = url.replace(/^file:/, "");
  return path.startsWith("//") ? fileURLToPath(url) : path;
}

async function hasInitializedSchema(database: LibSQLDatabase<typeof schema>) {
  const result = await database.get<{ count: number }>(sql`
    select count(*) as count
    from sqlite_master
    where type = 'table'
      and name = 'navbar_items'
  `);

  return Number(result?.count ?? 0) > 0;
}

async function hasSeedData(database: LibSQLDatabase<typeof schema>) {
  const result = await database.get<{ count: number }>(sql`select count(*) as count from ${schema.navbarItems}`);
  return Number(result?.count ?? 0) > 0;
}

export function ensureDatabaseReady(database: LibSQLDatabase<typeof schema>) {
  const databaseConfig = getDatabaseConfig();

  if (!isFileDatabaseUrl(databaseConfig.url)) {
    return Promise.resolve();
  }

  readyPromise ??= (async () => {
    const databasePath = getFileDatabasePath(databaseConfig.url);
    const missingOrEmpty = !existsSync(databasePath) || statSync(databasePath).size === 0;

    if (!missingOrEmpty && (await hasInitializedSchema(database)) && (await hasSeedData(database))) {
      return;
    }

    const [{ migrateDatabase }, { seedDatabase }] = await Promise.all([
      import("@/src/db/migrate"),
      import("@/src/db/seed"),
    ]);

    await migrateDatabase(database);
    await seedDatabase(database);
  })();

  return readyPromise;
}
