import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { media } from "./media";
import { users } from "./users";

export const articleStatus = pgEnum("article_status", [
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);

export const articleType = pgEnum("article_type", [
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
]);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 320 }).notNull(),
    subtitle: text("subtitle"),
    excerpt: text("excerpt"),
    content: jsonb("content").notNull(),
    renderedContent: text("rendered_content"),
    status: articleStatus("status").default("DRAFT").notNull(),
    type: articleType("type").default("STANDARD").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    heroImageId: uuid("hero_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    heroVideoId: uuid("hero_video_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mobileHeroImageId: uuid("mobile_hero_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    socialImageId: uuid("social_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 170 }),
    canonicalUrl: text("canonical_url"),
    sourceName: varchar("source_name", { length: 200 }),
    sourceUrl: text("source_url"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    allowComments: boolean("allow_comments").default(true).notNull(),
    readingMinutes: integer("reading_minutes").default(1).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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

export const articleRevisions = pgTable(
  "article_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 300 }).notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
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
