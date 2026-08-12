import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { media } from "./media";
import { users } from "./users";

export const articleStatusValues = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type ArticleStatus = (typeof articleStatusValues)[number];
const articleStatus = (name: string) => text(name, { enum: articleStatusValues });

export const articleTypeValues = [
  "STANDARD",
  "BREAKING",
  "LIVE_BLOG",
  "OPINION",
  "ANALYSIS",
  "INTERVIEW",
  "VIDEO",
  "GALLERY",
  "REVIEW",
  "EXPLAINER",
  "SPONSORED",
] as const;
export type ArticleType = (typeof articleTypeValues)[number];
const articleType = (name: string) => text(name, { enum: articleTypeValues });

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    title: text("title", { length: 300 }).notNull(),
    slug: text("slug", { length: 320 }).notNull(),
    subtitle: text("subtitle"),
    excerpt: text("excerpt"),
    content: text("content", { mode: "json" }).notNull(),
    renderedContent: text("rendered_content"),
    status: articleStatus("status").default("DRAFT").notNull(),
    type: articleType("type").default("STANDARD").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    heroImageId: text("hero_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    heroVideoId: text("hero_video_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mobileHeroImageId: text("mobile_hero_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    socialImageId: text("social_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    seoTitle: text("seo_title", { length: 70 }),
    seoDescription: text("seo_description", { length: 170 }),
    canonicalUrl: text("canonical_url"),
    sourceName: text("source_name", { length: 200 }),
    sourceUrl: text("source_url"),
    isFeatured: integer("is_featured", { mode: "boolean" }).default(false).notNull(),
    allowComments: integer("allow_comments", { mode: "boolean" }).default(true).notNull(),
    readingMinutes: integer("reading_minutes").default(1).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("articles_slug_unique").on(table.slug),
    index("articles_slug_idx").on(table.slug),
    index("articles_status_idx").on(table.status),
    index("articles_published_at_idx").on(table.publishedAt),
    index("articles_status_published_at_idx").on(table.status, table.publishedAt),
    index("articles_status_view_count_idx").on(table.status, table.viewCount),
    index("articles_type_published_at_idx").on(table.type, table.publishedAt),
    index("articles_author_id_idx").on(table.authorId),
    index("articles_scheduled_at_idx").on(table.scheduledAt),
    check(
      "articles_publication_dates_check",
      sql`(${table.status} <> 'PUBLISHED' OR ${table.publishedAt} IS NOT NULL)
        AND (${table.status} <> 'SCHEDULED' OR ${table.scheduledAt} IS NOT NULL)`,
    ),
    check("articles_reading_minutes_positive", sql`${table.readingMinutes} > 0`),
    check("articles_view_count_non_negative", sql`${table.viewCount} >= 0`),
  ],
);

export const articleRevisions = sqliteTable(
  "article_revisions",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    editorId: text("editor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title", { length: 300 }).notNull(),
    content: text("content", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("article_revisions_article_id_created_at_idx").on(
      table.articleId,
      table.createdAt,
    ),
  ],
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  heroImage: one(media, {
    fields: [articles.heroImageId],
    references: [media.id],
  }),
  heroVideo: one(media, {
    fields: [articles.heroVideoId],
    references: [media.id],
  }),
  revisions: many(articleRevisions),
}));

export const articleRevisionsRelations = relations(articleRevisions, ({ one }) => ({
  article: one(articles, {
    fields: [articleRevisions.articleId],
    references: [articles.id],
  }),
  editor: one(users, {
    fields: [articleRevisions.editorId],
    references: [users.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleRevision = typeof articleRevisions.$inferSelect;
export type NewArticleRevision = typeof articleRevisions.$inferInsert;
