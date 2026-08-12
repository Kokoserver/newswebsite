import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const sqliteUrlSchemes = ["file:", "libsql:", "https:", "http:", "ws:", "wss:"] as const;

function isSqliteCompatibleUrl(value: string | undefined) {
  return Boolean(value && sqliteUrlSchemes.some((scheme) => value.startsWith(scheme)));
}

const configuredUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.SQLITE_DATABASE_URL ??
  process.env.DATABASE_URL;
const databaseUrl = isSqliteCompatibleUrl(configuredUrl)
  ? configuredUrl!
  : "file:/tmp/daily-chronicle-demo.db";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
const usesRemoteLibsql = databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: usesRemoteLibsql ? "turso" : "sqlite",
  dbCredentials: usesRemoteLibsql
    ? {
        url: databaseUrl,
        authToken,
      }
    : {
        url: databaseUrl,
      },
  strict: true,
  verbose: true,
});
