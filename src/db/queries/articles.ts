import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import {
  articleCategories,
  articles,
  articleTags,
  categories,
  commentReactions,
  comments,
  media,
  tags,
  users,
} from "@/src/db/schema";

import { asDate } from "./rehydrate";

const getPublishedArticleBySlugCached = unstable_cache(
  async (slug: string) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();

    const article = await db.query.articles.findFirst({
      columns: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        excerpt: true,
        content: true,
        renderedContent: true,
        type: true,
        publishedAt: true,
        updatedAt: true,
        readingMinutes: true,
        viewCount: true,
        allowComments: true,
      },
      where: and(
        eq(articles.slug, slug),
        eq(articles.status, "PUBLISHED"),
        sql`${articles.deletedAt} IS NULL`,
      ),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        heroImage: {
          columns: {
            id: true,
            publicUrl: true,
            altText: true,
            width: true,
            height: true,
          },
        },
        heroVideo: {
          columns: {
            id: true,
            publicUrl: true,
            altText: true,
            caption: true,
            posterUrl: true,
            mimeType: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!article) {
      return null;
    }

    const [articleCategoryRows, articleTagRows] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          isPrimary: articleCategories.isPrimary,
        })
        .from(articleCategories)
        .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
        .where(eq(articleCategories.articleId, article.id)),
      db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
        })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id)),
    ]);

    return {
      ...article,
      categories: articleCategoryRows,
      tags: articleTagRows,
    };
  },
  ["article-by-slug-v2"],
  { revalidate: 60 },
);

export async function getPublishedArticleBySlug(slug: string) {
  const article = await getPublishedArticleBySlugCached(slug);

  if (!article) {
    return null;
  }

  return {
    ...article,
    publishedAt: asDate(article.publishedAt),
    updatedAt: asDate(article.updatedAt),
  };
}

const searchArticlesCached = unstable_cache(
  async (query: string, limit: number) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();

    const normalized = query.trim();

    if (!normalized) {
      return [];
    }

    const pattern = `%${normalized}%`;

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        authorName: users.name,
        heroImageUrl: media.publicUrl,
        heroImageAlt: media.altText,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .leftJoin(
        articleCategories,
        and(eq(articleCategories.articleId, articles.id), eq(articleCategories.isPrimary, true)),
      )
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(
        and(
          eq(articles.status, "PUBLISHED"),
          sql`${articles.deletedAt} IS NULL`,
          or(
            sql`lower(${articles.title}) LIKE lower(${pattern})`,
            sql`lower(${articles.excerpt}) LIKE lower(${pattern})`,
          ),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      categoryName: row.categoryName ?? "News",
      categorySlug: row.categorySlug ?? "news",
    }));
  },
  ["search-articles"],
  { revalidate: 60 },
);

export async function searchArticles(query: string, limit = 30) {
  return (await searchArticlesCached(query, limit)).map((row) => ({
    ...row,
    publishedAt: asDate(row.publishedAt),
  }));
}

const getLatestArticlesCached = unstable_cache(
  async (limit: number, offset: number) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        authorName: users.name,
        heroImageUrl: media.publicUrl,
        heroImageAlt: media.altText,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .leftJoin(
        articleCategories,
        and(eq(articleCategories.articleId, articles.id), eq(articleCategories.isPrimary, true)),
      )
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(and(eq(articles.status, "PUBLISHED"), sql`${articles.deletedAt} IS NULL`))
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      ...row,
      categoryName: row.categoryName ?? "News",
      categorySlug: row.categorySlug ?? "news",
    }));
  },
  ["latest-articles"],
  { revalidate: 60 },
);

export async function getLatestArticles(limit = 12, offset = 0) {
  return (await getLatestArticlesCached(limit, offset)).map((row) => ({
    ...row,
    publishedAt: asDate(row.publishedAt),
  }));
}

const getMostReadArticlesCached = unstable_cache(
  async (limit: number) => {
    const { getDb } = await import("@/src/db");
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
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .leftJoin(
        articleCategories,
        and(eq(articleCategories.articleId, articles.id), eq(articleCategories.isPrimary, true)),
      )
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(and(eq(articles.status, "PUBLISHED"), sql`${articles.deletedAt} IS NULL`))
      .orderBy(desc(articles.viewCount), desc(articles.publishedAt))
      .limit(limit);
  },
  ["most-read-articles"],
  { revalidate: 60 },
);

export async function getMostReadArticles(limit = 10) {
  return (await getMostReadArticlesCached(limit)).map((row) => ({
    ...row,
    publishedAt: asDate(row.publishedAt),
  }));
}

const countLatestArticlesCached = unstable_cache(
  async () => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(eq(articles.status, "PUBLISHED"), sql`${articles.deletedAt} IS NULL`));

    return row?.count ?? 0;
  },
  ["count-latest-articles"],
  { revalidate: 60 },
);

export async function countLatestArticles() {
  return countLatestArticlesCached();
}

export async function getAdminArticleList(status?: (typeof articles.$inferSelect)["status"]) {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      type: articles.type,
      publishedAt: articles.publishedAt,
      scheduledAt: articles.scheduledAt,
      authorName: users.name,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .innerJoin(users, eq(articles.authorId, users.id))
    .where(status ? eq(articles.status, status) : undefined)
    .orderBy(desc(articles.updatedAt))
    .limit(100);
}

export async function getArticlesByIds(articleIds: string[]) {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  if (articleIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(inArray(articles.id, articleIds));
}

export async function getApprovedCommentsForArticle(
  articleId: string,
  currentUserId: string | null = null,
  limit = 25,
) {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  const rows = await db
    .select({
      id: comments.id,
      authorName: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
      userName: users.name,
      userImage: users.image,
      likes: sql<number>`(
        select count(*) from ${commentReactions}
        where ${commentReactions.commentId} = ${comments.id}
          and ${commentReactions.reactionType} = 'LIKE'
      )`,
      dislikes: sql<number>`(
        select count(*) from ${commentReactions}
        where ${commentReactions.commentId} = ${comments.id}
          and ${commentReactions.reactionType} = 'DISLIKE'
      )`,
      myReaction: sql<string | null>`(
        select ${commentReactions.reactionType} from ${commentReactions}
        where ${commentReactions.commentId} = ${comments.id}
          and ${commentReactions.userId} = ${currentUserId}
        limit 1
      )`,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(
      and(
        eq(comments.articleId, articleId),
        eq(comments.status, "APPROVED"),
        sql`${comments.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(comments.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    likes: Number(row.likes ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    myReaction: (row.myReaction ?? null) as "LIKE" | "DISLIKE" | null,
  }));
}

const getRelatedArticlesCached = unstable_cache(
  async (articleId: string, categoryIds: string[], limit: number) => {
    const { getDb } = await import("@/src/db");
    const db = await getDb();

    if (categoryIds.length === 0) {
      return getLatestArticlesCached(limit, 0);
    }

    return db
      .selectDistinct({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        heroImageUrl: media.publicUrl,
        heroImageAlt: media.altText,
        publishedAt: articles.publishedAt,
      })
      .from(articleCategories)
      .innerJoin(articles, eq(articleCategories.articleId, articles.id))
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .where(
        and(
          inArray(articleCategories.categoryId, categoryIds),
          sql`${articles.id} <> ${articleId}`,
          eq(articles.status, "PUBLISHED"),
          sql`${articles.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  },
  ["related-articles"],
  { revalidate: 60 },
);

export async function getRelatedArticles(articleId: string, categoryIds: string[], limit = 4) {
  return (await getRelatedArticlesCached(articleId, categoryIds, limit)).map((row) => ({
    ...row,
    publishedAt: asDate(row.publishedAt),
  }));
}
