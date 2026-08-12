import { desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/src/db";
import { articleViewDailyStats, articles } from "@/src/db/schema";

export async function getArticleViewAggregation(articleId: string) {
  const db = await getDb();
  const [summary] = await db
    .select({
      totalViews: sql<number>`coalesce(sum(${articleViewDailyStats.views}), 0)`,
      totalUniqueVisitors: sql<number>`coalesce(sum(${articleViewDailyStats.uniqueVisitors}), 0)`,
    })
    .from(articleViewDailyStats)
    .where(eq(articleViewDailyStats.articleId, articleId));

  return summary;
}

export async function getArticleViewCount(articleId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ viewCount: articles.viewCount })
    .from(articles)
    .where(eq(articles.id, articleId));

  return row?.viewCount ?? 0;
}

const getTrendingArticlesCached = unstable_cache(
  async (limit: number) => {
    const db = await getDb();
    return db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        views: sql<number>`coalesce(sum(${articleViewDailyStats.views}), 0)`,
      })
      .from(articleViewDailyStats)
      .innerJoin(articles, eq(articleViewDailyStats.articleId, articles.id))
      .groupBy(articles.id)
      .orderBy(desc(sql`coalesce(sum(${articleViewDailyStats.views}), 0)`))
      .limit(limit);
  },
  ["trending-articles"],
  { revalidate: 60 },
);

export async function getTrendingArticles(limit = 10) {
  return getTrendingArticlesCached(limit);
}
