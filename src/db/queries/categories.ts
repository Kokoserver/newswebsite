import { and, asc, desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import {
  articleCategories,
  articles,
  categories,
  media,
  navbarItems,
} from "@/src/db/schema";

import { asDate } from "./rehydrate";

const getCategoryArchiveCached = unstable_cache(
  async (slug: string, limit: number, offset: number) => {
    const { db } = await import("@/src/db");

    const category = await db.query.categories.findFirst({
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      where: eq(categories.slug, slug),
    });

    if (!category) {
      return null;
    }

    const items = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        heroImageUrl: media.publicUrl,
        heroImageAlt: media.altText,
      })
      .from(articleCategories)
      .innerJoin(articles, eq(articleCategories.articleId, articles.id))
      .leftJoin(media, eq(articles.heroImageId, media.id))
      .where(
        and(
          eq(articleCategories.categoryId, category.id),
          eq(articles.status, "PUBLISHED"),
          sql`${articles.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(offset);

    return { category, items };
  },
  ["category-archive"],
  { revalidate: 60 },
);

export async function getCategoryArchive(slug: string, limit = 24, offset = 0) {
  const result = await getCategoryArchiveCached(slug, limit, offset);

  if (!result) {
    return null;
  }

  return {
    category: result.category,
    items: result.items.map((item) => ({
      ...item,
      publishedAt: asDate(item.publishedAt),
    })),
  };
}

const countCategoryArticlesCached = unstable_cache(
  async (slug: string) => {
    const { db } = await import("@/src/db");

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articleCategories)
      .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
      .innerJoin(articles, eq(articleCategories.articleId, articles.id))
      .where(
        and(
          eq(categories.slug, slug),
          eq(articles.status, "PUBLISHED"),
          sql`${articles.deletedAt} IS NULL`,
        ),
      );

    return row?.count ?? 0;
  },
  ["count-category-articles"],
  { revalidate: 60 },
);

export async function countCategoryArticles(slug: string) {
  return countCategoryArticlesCached(slug);
}

export async function getActiveCategories() {
  const { db } = await import("@/src/db");

  return db.query.categories.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      position: true,
    },
    where: eq(categories.isActive, true),
    orderBy: [categories.position, categories.name],
  });
}

const getNavbarCategoriesCached = unstable_cache(
  async () => {
    const { db } = await import("@/src/db");

    return db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        label: navbarItems.label,
        href: navbarItems.href,
        position: navbarItems.position,
      })
      .from(navbarItems)
      .innerJoin(categories, eq(navbarItems.categoryId, categories.id))
      .where(and(eq(navbarItems.isActive, true), eq(categories.isActive, true)))
      .orderBy(asc(navbarItems.position), asc(navbarItems.label));
  },
  ["navbar-categories"],
  { revalidate: 60 },
);

export async function getNavbarCategories() {
  return getNavbarCategoriesCached();
}

export async function getArticleCategoryOptions() {
  const { db } = await import("@/src/db");

  return db.query.categories.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      position: true,
    },
    where: eq(categories.isActive, true),
    orderBy: [categories.position, categories.name],
  });
}

export async function getCategoryBySlug(slug: string) {
  const { db } = await import("@/src/db");

  return db.query.categories.findFirst({
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      position: true,
    },
    where: and(eq(categories.slug, slug), eq(categories.isActive, true)),
  });
}
