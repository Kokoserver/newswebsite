import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentAdminUser, hasPermission } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { articles } from "@/src/db/schema";

const defaultLimit = 12;
const maxLimit = 30;

export async function GET(request: Request) {
  const actor = await getCurrentAdminUser();
  if (!actor) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasPermission(actor.role, "homepage:manage")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedId = url.searchParams.get("id")?.trim();
  const query = url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit),
  );
  const db = await getDb();
  const items = await db.query.articles.findMany({
    columns: { id: true, title: true, status: true },
    where: and(
      isNull(articles.deletedAt),
      requestedId ? eq(articles.id, requestedId) : undefined,
      !requestedId && query ? ilike(articles.title, `%${query}%`) : undefined,
    ),
    orderBy: [desc(articles.updatedAt)],
    limit: requestedId ? 1 : limit,
  });

  return NextResponse.json({ items });
}
