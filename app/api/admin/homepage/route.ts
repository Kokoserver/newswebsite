import { asc, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentAdminUser, hasPermission } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { homepageItems, homepageSections, media } from "@/src/db/schema";

export async function GET(request: Request) {
  const actor = await getCurrentAdminUser();
  if (!actor) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }
  if (!hasPermission(actor.role, "homepage:manage")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const sectionId = url.searchParams.get("section")?.trim();
  const db = await getDb();

  const [sections, mediaRows] = await Promise.all([
    db.query.homepageSections.findMany({ orderBy: [asc(homepageSections.position)] }),
    db.query.media.findMany({
      columns: { id: true, title: true, publicUrl: true },
      where: isNull(media.deletedAt),
      orderBy: [desc(media.createdAt)],
      limit: 200,
    }),
  ]);

  let items;
  if (sectionId) {
    items = await db.query.homepageItems.findMany({
      where: eq(homepageItems.sectionId, sectionId),
      with: { article: { columns: { title: true, status: true } } },
      orderBy: [asc(homepageItems.position)],
    });
  } else {
    items = await db.query.homepageItems.findMany({
      with: { article: { columns: { title: true, status: true } } },
      orderBy: [asc(homepageItems.position)],
    });
  }

  return NextResponse.json({ sections, items, media: mediaRows });
}
