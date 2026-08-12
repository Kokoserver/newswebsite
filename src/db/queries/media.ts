import { and, desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/src/db";
import { media } from "@/src/db/schema";

import { asDate } from "./rehydrate";

export async function getMediaLibraryItems(kind?: (typeof media.$inferSelect)["kind"]) {
  const db = await getDb();
  return db.query.media.findMany({
    columns: {
      id: true,
      kind: true,
      title: true,
      altText: true,
      publicUrl: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      createdAt: true,
    },
    where: kind ? eq(media.kind, kind) : undefined,
    orderBy: [desc(media.createdAt)],
    limit: 100,
  });
}

const getVideoMediaCached = unstable_cache(
  async (limit: number) => {
    const db = await getDb();
    return db
      .select({
        id: media.id,
        title: media.title,
        slug: media.slug,
        altText: media.altText,
        caption: media.caption,
        posterUrl: media.posterUrl,
        publicUrl: media.publicUrl,
        mimeType: media.mimeType,
        byteSize: media.byteSize,
        width: media.width,
        height: media.height,
        createdAt: media.createdAt,
      })
      .from(media)
      .where(and(eq(media.kind, "VIDEO"), sql`${media.deletedAt} IS NULL`))
      .orderBy(desc(media.createdAt))
      .limit(limit);
  },
  ["video-media"],
  { revalidate: 60 },
);

export async function getVideoMedia(limit = 12) {
  return (await getVideoMediaCached(limit)).map((row) => ({
    ...row,
    createdAt: asDate(row.createdAt) as Date,
  }));
}

export async function getVideoBySlug(slug: string) {
  const db = await getDb();
  return db.query.media.findFirst({
    columns: {
      id: true,
      kind: true,
      title: true,
      slug: true,
      altText: true,
      caption: true,
      posterUrl: true,
      publicUrl: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      createdAt: true,
    },
    where: and(eq(media.slug, slug), eq(media.kind, "VIDEO"), sql`${media.deletedAt} IS NULL`),
  });
}
