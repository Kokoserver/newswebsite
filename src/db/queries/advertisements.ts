import { and, asc, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { advertisementAssignments, advertisements, media } from "@/src/db/schema";

type AdvertisementSlot = typeof advertisementAssignments.$inferSelect.slot;

const getAdvertisementsBySlotCached = unstable_cache(
  async (slot: AdvertisementSlot, limit: number) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();
    const now = new Date();

    return db
      .select({
        id: advertisements.id,
        name: advertisements.name,
        targetUrl: advertisements.targetUrl,
        slot: advertisementAssignments.slot,
        position: advertisementAssignments.position,
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
  },
  ["advertisements-by-slot"],
  { revalidate: 60 },
);

export async function getAdvertisementsBySlot(slot: AdvertisementSlot, limit = 1) {
  return getAdvertisementsBySlotCached(slot, limit);
}

export async function getAdminAdvertisements() {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  return db
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
    .orderBy(desc(advertisements.createdAt), asc(advertisementAssignments.position));
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
