export type MediaCursor = { createdAt: number; id: string };

export function decodeMediaCursor(value: string | null | undefined): MediaCursor | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as MediaCursor;
    return Number.isFinite(parsed.createdAt) && parsed.createdAt > 0 && typeof parsed.id === "string" && parsed.id.length <= 100
      ? parsed
      : null;
  } catch { return null; }
}

export function encodeMediaCursor(value: MediaCursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
