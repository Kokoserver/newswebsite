import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const viewPayloadSchema = z.object({
  articleId: z.string().uuid(),
  visitorId: z.string().trim().min(1).max(128).optional(),
  referrer: z.string().trim().min(1).max(2_048).optional(),
});

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let payload;

  try {
    payload = viewPayloadSchema.parse(await request.json());
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const { getDb } = await import("@/src/db");
    const db = await getDb();
  const { articleViewDailyStats, articleViews, articles } = await import("@/src/db/schema");

  const article = await db.query.articles.findFirst({
    columns: { id: true },
    where: and(
      eq(articles.id, payload.articleId),
      eq(articles.status, "PUBLISHED"),
      sql`${articles.deletedAt} IS NULL`,
    ),
  });

  if (!article) {
    return new NextResponse("Not found", { status: 404 });
  }

  const visitorHash = payload.visitorId ?? null;
  let isNewVisitor = true;

  if (visitorHash) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [existingView] = await db
      .select({ id: articleViews.id })
      .from(articleViews)
      .where(
        and(
          eq(articleViews.articleId, payload.articleId),
          eq(articleViews.visitorHash, visitorHash),
          gte(articleViews.viewedAt, todayStart),
        ),
      )
      .limit(1);

    isNewVisitor = !existingView;
  }

  const today = new Date().toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.insert(articleViews).values({
      articleId: payload.articleId,
      visitorHash,
      referrer: payload.referrer ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 2_048) ?? null,
    });

    await tx
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, payload.articleId));

    await tx
      .insert(articleViewDailyStats)
      .values({
        articleId: payload.articleId,
        day: today,
        views: 1,
        uniqueVisitors: isNewVisitor ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [articleViewDailyStats.articleId, articleViewDailyStats.day],
        set: {
          views: sql`${articleViewDailyStats.views} + 1`,
          uniqueVisitors: sql`${articleViewDailyStats.uniqueVisitors} + ${isNewVisitor ? 1 : 0}`,
        },
      });
  });

  return new NextResponse(null, { status: 204 });
}
