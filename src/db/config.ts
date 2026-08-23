import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { join } from "node:path";
import { tmpdir } from "node:os";

const sqliteUrlSchemes = ["file:", "libsql:", "https:", "http:", "ws:", "wss:"] as const;

function isSqliteCompatibleUrl(value: string | undefined) {
  return Boolean(value && sqliteUrlSchemes.some((scheme) => value.startsWith(scheme)));
}

export function getDatabaseConfig() {
  const configuredUrl =
    process.env.TURSO_DATABASE_URL ??
    process.env.SQLITE_DATABASE_URL ??
    process.env.DATABASE_URL;
  const defaultFileUrl = `file:${join(tmpdir(), "daily-chronicle-demo.db").replaceAll("\\", "/")}`;
  const url = isSqliteCompatibleUrl(configuredUrl)
    ? configuredUrl!
    : defaultFileUrl;

  return {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
  };
}

export function isFileDatabaseUrl(url: string) {
  return url.startsWith("file:");
}

export function ensureFileDatabaseDirectory(url: string) {
  if (isFileDatabaseUrl(url)) {
    mkdirSync(dirname(url.replace(/^file:/, "")), { recursive: true });
  }
}
