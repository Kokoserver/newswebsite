"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { requireAdminUser } from "@/src/admin/permissions";
import { optionalText } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { auditLogs, media } from "@/src/db/schema";

export async function updateMedia(mediaId: string, formData: FormData) {
  const actor = await requireAdminUser("media:manage");
  const db = await getDb();
  const title = optionalText(formData, "title");
  await db.transaction(async (tx) => {
    await tx.update(media).set({ title, altText: optionalText(formData, "altText"), caption: optionalText(formData, "caption") }).where(eq(media.id, mediaId));
    await tx.insert(auditLogs).values({ actorId: actor.id, action: "UPDATE", entityType: "media", entityId: mediaId, summary: `Updated ${title ?? "media metadata"}`, metadata: {} });
  });
  revalidatePath("/admin/media"); revalidatePath("/");
  updateTag("media"); updateTag("homepage"); updateTag("advertisements");
}

export async function deleteMedia(mediaId: string) {
  const actor = await requireAdminUser("media:manage");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const item = await tx.query.media.findFirst({ columns: { title: true }, where: eq(media.id, mediaId) });
    await tx.update(media).set({ deletedAt: new Date() }).where(eq(media.id, mediaId));
    await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "media", entityId: mediaId, summary: `Removed ${item?.title ?? "media"} from the library`, metadata: {} });
  });
  revalidatePath("/admin/media"); revalidatePath("/");
  updateTag("media"); updateTag("homepage"); updateTag("advertisements");
}
