import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const localRoot = path.join(process.cwd(), ".data", "uploads");

export type StoredMedia = { storageKey: string; publicUrl: string; provider: "bunny" };

type BunnyConfig = {
  zone: string;
  accessKey: string;
  storageHost: string;
  pullZoneUrl: string;
};

function cleanStorageHost(value: string) {
  const host = value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (host.includes("/") || !(host === "storage.bunnycdn.com" || host.endsWith(".storage.bunnycdn.com"))) {
    throw new Error("BUNNY_STORAGE_HOSTNAME must be a Bunny regional storage hostname.");
  }
  return host;
}

export function getBunnyConfig(): BunnyConfig {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const accessKey =
    process.env.BUNNY_STORAGE_PASSWORD?.trim() ??
    process.env.BUNNY_STORAGE_ACCESS_KEY?.trim();
  const pullZone =
    process.env.BUNNY_CDN_URL?.trim() ??
    process.env.BUNNY_PULL_ZONE_URL?.trim();
  if (!zone || !accessKey || !pullZone) {
    throw new Error("Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD and BUNNY_CDN_URL.");
  }
  const pullZoneUrl = new URL(pullZone);
  if (pullZoneUrl.protocol !== "https:") throw new Error("BUNNY_CDN_URL must use HTTPS.");
  return {
    zone,
    accessKey,
    storageHost: cleanStorageHost(process.env.BUNNY_STORAGE_HOSTNAME?.trim() || "storage.bunnycdn.com"),
    pullZoneUrl: pullZoneUrl.toString().replace(/\/$/, ""),
  };
}

export function bunnyConfigured() {
  try { getBunnyConfig(); return true; } catch { return false; }
}

export function uploadLimit() {
  return Number.parseInt(process.env.BUNNY_UPLOAD_MAX_BYTES ?? "15728640", 10);
}

export async function storeMedia(bytes: Uint8Array, storageKey: string, mimeType: string): Promise<StoredMedia> {
  const config = getBunnyConfig();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const checksum = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://${config.storageHost}/${encodeURIComponent(config.zone)}/${encodedKey}`, {
    method: "PUT",
    headers: { AccessKey: config.accessKey, "Content-Type": mimeType, Checksum: checksum },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Bunny Storage rejected the upload (${response.status})${detail ? `: ${detail.slice(0, 180)}` : "."}`);
  }
  return { storageKey, publicUrl: `${config.pullZoneUrl}/${encodedKey}`, provider: "bunny" };
}

export async function readLocalMedia(storageKey: string) {
  const target = path.resolve(localRoot, storageKey);
  if (!target.startsWith(path.resolve(localRoot) + path.sep)) return null;
  try { return await readFile(target); } catch { return null; }
}
