import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { unstable_cache } from "next/cache";

import { getDb } from "@/src/db";
import {
  articleCategories,
  commentReactions,
  comments,
  articles,
  categories,
  homepageItems,
  homepageSections,
  media,
} from "@/src/db/schema";

import { asDate } from "./rehydrate";

const heroVideo = alias(media, "article_hero_video");

const getHomepageDataCached = unstable_cache(
  async () => {
    const db = await getDb();
    const now = new Date();
    const rows = await db
      .select({
        sectionId: homepageSections.id,
        sectionKey: homepageSections.key,
        sectionTitle: homepageSections.title,
        sectionKind: homepageSections.kind,
        sectionPosition: homepageSections.position,
        itemId: homepageItems.id,
        itemPosition: homepageItems.position,
        titleOverride: homepageItems.titleOverride,
        dekOverride: homepageItems.dekOverride,
        articleId: articles.id,
        articleTitle: articles.title,
        articleSlug: articles.slug,
        articleExcerpt: articles.excerpt,
        articleViewCount: articles.viewCount,
        articleCommentCount: sql<number>`(
          select count(*)
          from ${comments}
          where ${comments.articleId} = ${articles.id}
            and ${comments.status} = 'APPROVED'
            and ${comments.deletedAt} is null
        )`,
        articleLikeCount: sql<number>`(
          select count(*)
          from ${commentReactions}
          inner join ${comments} on ${commentReactions.commentId} = ${comments.id}
          where ${comments.articleId} = ${articles.id}
            and ${comments.status} = 'APPROVED'
            and ${comments.deletedAt} is null
            and ${commentReactions.reactionType} = 'LIKE'
        )`,
        publishedAt: articles.publishedAt,
        articleCategoryName: categories.name,
        articleCategorySlug: categories.slug,
        articleVideoUrl: heroVideo.publicUrl,
        articleVideoPoster: heroVideo.posterUrl,
        articleVideoCaption: heroVideo.caption,
        mediaId: media.id,
        mediaUrl: media.publicUrl,
        mediaAlt: media.altText,
        mediaTitle: media.title,
        mediaSlug: media.slug,
      })
      .from(homepageSections)
      .leftJoin(homepageItems, eq(homepageItems.sectionId, homepageSections.id))
      .leftJoin(articles, eq(homepageItems.articleId, articles.id))
      .leftJoin(
        articleCategories,
        and(eq(articleCategories.articleId, articles.id), eq(articleCategories.isPrimary, true)),
      )
      .leftJoin(categories, eq(articleCategories.categoryId, categories.id))
      .leftJoin(heroVideo, eq(articles.heroVideoId, heroVideo.id))
      .leftJoin(media, eq(homepageItems.mediaId, media.id))
      .where(
        and(
          or(isNull(homepageItems.startsAt), lte(homepageItems.startsAt, now)),
          or(isNull(homepageItems.endsAt), gte(homepageItems.endsAt, now)),
        ),
      )
      .orderBy(asc(homepageSections.position), asc(homepageItems.position));

    return rows.reduce<
      Array<{
        id: string;
        key: string;
        title: string;
        kind: string;
        position: number;
        items: typeof rows;
      }>
    >((sections, row) => {
      let section = sections.find((item) => item.id === row.sectionId);

      if (!section) {
        section = {
          id: row.sectionId,
          key: row.sectionKey,
          title: row.sectionTitle,
          kind: row.sectionKind,
          position: row.sectionPosition,
          items: [],
        };
        sections.push(section);
      }

      if (row.itemId) {
        section.items.push(row);
      }

      return sections;
    }, []);
  },
  ["homepage-data"],
  { revalidate: 60 },
);

export async function getHomepageData() {
  const sections = await getHomepageDataCached();

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      publishedAt: asDate(item.publishedAt),
    })),
  }));
}

export async function getHomepageSectionItems(sectionKey: string) {
  const db = await getDb();
  return db
    .select({
      id: homepageItems.id,
      position: homepageItems.position,
      titleOverride: homepageItems.titleOverride,
      articleTitle: articles.title,
      articleSlug: articles.slug,
      mediaUrl: media.publicUrl,
    })
    .from(homepageItems)
    .innerJoin(homepageSections, eq(homepageItems.sectionId, homepageSections.id))
    .leftJoin(articles, eq(homepageItems.articleId, articles.id))
    .leftJoin(media, eq(homepageItems.mediaId, media.id))
    .where(eq(homepageSections.key, sectionKey))
    .orderBy(asc(homepageItems.position));
}
