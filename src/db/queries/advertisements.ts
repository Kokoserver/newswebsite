import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import {
  advertisementAssignments,
  advertisementMedia,
  advertisements,
  media,
} from "@/src/db/schema";

type AdvertisementSlot = typeof advertisementAssignments.$inferSelect.slot;

export type AdvertisementMediaItem = {
  id: string;
  kind: string;
  publicUrl: string;
  posterUrl: string | null;
  alt: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  position: number;
};

async function getAdvertisementMediaItems(
  advertisementIds: string[],
): Promise<Map<string, AdvertisementMediaItem[]>> {
  if (advertisementIds.length === 0) return new Map();

  const { getDb } = await import("@/src/db");
  const db = await getDb();

  const rows = await db
    .select({
      advertisementId: advertisementMedia.advertisementId,
      id: media.id,
      kind: media.kind,
      publicUrl: media.publicUrl,
      posterUrl: media.posterUrl,
      alt: media.altText,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      position: advertisementMedia.position,
    })
    .from(advertisementMedia)
    .innerJoin(media, eq(advertisementMedia.mediaId, media.id))
    .where(
      and(
        inArray(advertisementMedia.advertisementId, advertisementIds),
        isNull(media.deletedAt),
      ),
    )
    .orderBy(asc(advertisementMedia.position));

  const grouped = new Map<string, AdvertisementMediaItem[]>();
  for (const row of rows) {
    const items = grouped.get(row.advertisementId) ?? [];
    items.push(row);
    grouped.set(row.advertisementId, items);
  }
  return grouped;
}

const getAdvertisementsBySlotCached = unstable_cache(
  async (slot: AdvertisementSlot, limit: number) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();
    const now = new Date();

    const ads = await db
      .select({
        id: advertisements.id,
        name: advertisements.name,
        targetUrl: advertisements.targetUrl,
        slot: advertisementAssignments.slot,
        position: advertisementAssignments.position,
        mediaId: advertisements.mediaId,
        mediaUrl: media.publicUrl,
        mediaAlt: media.altText,
        mediaWidth: media.width,
        mediaHeight: media.height,
      })
      .from(advertisementAssignments)
      .innerJoin(advertisements, eq(advertisementAssignments.advertisementId, advertisements.id))
      .leftJoin(media, eq(advertisements.mediaId, media.id))
      .where(
        and(
          eq(advertisementAssignments.slot, slot),
          isNull(advertisementAssignments.articleId),
          eq(advertisements.status, "ACTIVE"),
          lte(advertisements.startsAt, now),
          gte(advertisements.endsAt, now),
          lte(advertisementAssignments.startsAt, now),
          gte(advertisementAssignments.endsAt, now),
        ),
      )
      .orderBy(asc(advertisementAssignments.position), asc(advertisements.createdAt))
      .limit(limit);

    const mediaItems = await getAdvertisementMediaItems(
      ads.map((ad) => ad.id),
    );

    return ads.map((ad) => ({
      ...ad,
      mediaItems: mediaItems.get(ad.id) ?? [],
    }));
  },
  ["advertisements-by-slot"],
  { revalidate: 60, tags: ["advertisements", "media"] },
);

export async function getAdvertisementsBySlot(slot: AdvertisementSlot, limit = 1) {
  return getAdvertisementsBySlotCached(slot, limit);
}

export async function getAdminAdvertisements(limit = 10, offset = 0) {
  const { getDb } = await import("@/src/db");
  const db = await getDb();
  const page = await db
    .select({ id: advertisements.id })
    .from(advertisements)
    .orderBy(desc(advertisements.createdAt), desc(advertisements.id))
    .limit(limit)
    .offset(offset);

  if (page.length === 0) return [];

  const ads = await db
    .select({
      id: advertisements.id,
      name: advertisements.name,
      status: advertisements.status,
      targetUrl: advertisements.targetUrl,
      mediaId: advertisements.mediaId,
      startsAt: advertisements.startsAt,
      endsAt: advertisements.endsAt,
      createdAt: advertisements.createdAt,
      assignmentId: advertisementAssignments.id,
      slot: advertisementAssignments.slot,
      position: advertisementAssignments.position,
      assignmentStartsAt: advertisementAssignments.startsAt,
      assignmentEndsAt: advertisementAssignments.endsAt,
      mediaUrl: media.publicUrl,
      mediaAlt: media.altText,
      mediaTitle: media.title,
    })
    .from(advertisements)
    .leftJoin(advertisementAssignments, eq(advertisementAssignments.advertisementId, advertisements.id))
    .leftJoin(media, eq(advertisements.mediaId, media.id))
    .where(inArray(advertisements.id, page.map((item) => item.id)))
    .orderBy(desc(advertisements.createdAt), asc(advertisementAssignments.position));

  const mediaItems = await getAdvertisementMediaItems(
    ads.map((ad) => ad.id),
  );

  return ads.map((ad) => ({
    ...ad,
    mediaItems: mediaItems.get(ad.id) ?? [],
  }));
}

export async function getAdminAdvertisementCount() {
  const { getDb } = await import("@/src/db");
  const db = await getDb();
  const rows = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(advertisements);

  return Number(rows[0]?.count ?? 0);
}

export async function getAdvertisementMediaOptions(limit = 100) {
  const { getDb } = await import("@/src/db");
  const db = await getDb();

  return db
    .select({
      id: media.id,
      title: media.title,
      publicUrl: media.publicUrl,
      altText: media.altText,
    })
    .from(media)
    .where(and(eq(media.kind, "IMAGE"), isNull(media.deletedAt)))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}
