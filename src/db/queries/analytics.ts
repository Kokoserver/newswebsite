import { and, desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/src/db";
import { articleCategories, articleViewDailyStats, articles, categories, media } from "@/src/db/schema";

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
        categoryName: categories.name,
        categorySlug: categories.slug,
        imageUrl: media.publicUrl,
        imageAlt: media.altText,
        views: sql<number>`coalesce(sum(${articleViewDailyStats.views}), 0)`,
      })
      .from(articleViewDailyStats)
      .innerJoin(articles, eq(articleViewDailyStats.articleId, articles.id))
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .leftJoin(
        articleCategories,
        and(eq(articleCategories.articleId, articles.id), eq(articleCategories.isPrimary, true)),
      )
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .groupBy(articles.id, categories.name, categories.slug, media.publicUrl, media.altText)
      .orderBy(desc(sql`coalesce(sum(${articleViewDailyStats.views}), 0)`))
      .limit(limit);
  },
  ["trending-articles"],
  { revalidate: 60, tags: ["analytics", "articles"] },
);

export async function getTrendingArticles(limit = 10) {
  return getTrendingArticlesCached(limit);
}
