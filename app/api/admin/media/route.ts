import { randomUUID } from "node:crypto";
import path from "node:path";

import { and, desc, eq, isNull, like, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import sharp from "sharp";
import slugify from "slugify";

import { getCurrentAdminUser, hasPermission } from "@/src/admin/permissions";
import { decodeMediaCursor, encodeMediaCursor } from "@/src/admin/media-cursor";
import { storeMedia, uploadLimit } from "@/src/admin/storage";
import { getDb } from "@/src/db";
import { auditLogs, media } from "@/src/db/schema";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);
const defaultPageSize = 24;
const maxPageSize = 60;

export async function GET(request: Request) {
  const actor = await getCurrentAdminUser();
  if (!actor) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.role, "media:view")) return NextResponse.json({ message: "Forbidden." }, { status: 403 });

  const url = new URL(request.url);
  const requestedId = url.searchParams.get("id")?.trim();
  const query = url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const requestedKind = url.searchParams.get("kind");
  const kind = requestedKind === "IMAGE" || requestedKind === "VIDEO" ? requestedKind : null;
  const limit = Math.min(maxPageSize, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? String(defaultPageSize), 10) || defaultPageSize));
  const cursor = decodeMediaCursor(url.searchParams.get("cursor"));
  const db = await getDb();
  const rows = await db.query.media.findMany({
    columns: { id: true, title: true, kind: true, publicUrl: true, altText: true, caption: true, posterUrl: true, createdAt: true },
    where: and(
      isNull(media.deletedAt),
      requestedId ? eq(media.id, requestedId) : undefined,
      kind ? eq(media.kind, kind) : or(eq(media.kind, "IMAGE"), eq(media.kind, "VIDEO")),
      query ? or(like(media.title, `%${query}%`), like(media.altText, `%${query}%`), like(media.caption, `%${query}%`)) : undefined,
      !requestedId && cursor ? or(lt(media.createdAt, new Date(cursor.createdAt)), and(eq(media.createdAt, new Date(cursor.createdAt)), lt(media.id, cursor.id))) : undefined,
    ),
    orderBy: [desc(media.createdAt), desc(media.id)],
    limit: requestedId ? 1 : limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return NextResponse.json({
    items,
    nextCursor: hasMore && last ? encodeMediaCursor({ createdAt: last.createdAt.getTime(), id: last.id }) : null,
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentAdminUser();
  if (!actor) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.role, "media:upload")) return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Choose a file to upload." }, { status: 400 });
  if (!allowed.has(file.type)) return NextResponse.json({ message: "This file type is not supported." }, { status: 400 });
  if (file.size <= 0 || file.size > uploadLimit()) return NextResponse.json({ message: "The file exceeds the upload limit." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let width: number | null = null; let height: number | null = null;
  if (file.type.startsWith("image/")) {
    try { const metadata = await sharp(bytes).metadata(); width = metadata.width ?? null; height = metadata.height ?? null; }
    catch { return NextResponse.json({ message: "The image is malformed or unsupported." }, { status: 400 }); }
  }
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || (file.type.startsWith("video/") ? ".mp4" : ".jpg");
  const base = slugify(String(form.get("title") || path.basename(file.name, path.extname(file.name))), { lower: true, strict: true }) || "media";
  const storageKey = `${new Date().toISOString().slice(0, 10)}/${base}-${randomUUID().slice(0, 8)}${extension}`;
  try {
    const stored = await storeMedia(bytes, storageKey, file.type);
    const db = await getDb();
    const [created] = await db.insert(media).values({ kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE", title: String(form.get("title") ?? "").trim() || file.name, slug: `${base}-${randomUUID().slice(0, 8)}`, altText: String(form.get("altText") ?? "").trim() || null, bunnyPath: stored.storageKey, publicUrl: stored.publicUrl, mimeType: file.type, byteSize: file.size, width, height, uploadedById: actor.id, metadata: { provider: stored.provider, originalName: file.name } }).returning({ id: media.id });
    await db.insert(auditLogs).values({ actorId: actor.id, action: "CREATE", entityType: "media", entityId: created.id, summary: `Uploaded ${file.name}`, metadata: { provider: stored.provider, byteSize: file.size } });
    const createdMedia = await db.query.media.findFirst({
      columns: { id: true, title: true, kind: true, publicUrl: true, altText: true, caption: true, posterUrl: true, createdAt: true },
      where: eq(media.id, created.id),
    });
    return NextResponse.json({ message: "Media uploaded successfully.", item: createdMedia }, { status: 201 });
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json(
      { message: "The media service could not complete the upload. Please try again." },
      { status: 500 },
    );
  }
}
