import { and, eq, isNull } from "drizzle-orm";

import { readLocalMedia } from "@/src/admin/storage";
import { getDb } from "@/src/db";
import { media } from "@/src/db/schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const storageKey = path.join("/");
  const db = await getDb();
  const item = await db.query.media.findFirst({ columns: { mimeType: true, byteSize: true }, where: and(eq(media.bunnyPath, storageKey), isNull(media.deletedAt)) });
  if (!item) return new Response("Not found", { status: 404 });
  const bytes = await readLocalMedia(storageKey);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(bytes, { headers: { "Content-Type": item.mimeType, "Content-Length": String(bytes.byteLength), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
