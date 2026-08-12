import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { articles } from "./articles";

export const articleViews = sqliteTable(
  "article_views",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    visitorHash: text("visitor_hash", { length: 128 }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    viewedAt: integer("viewed_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("article_views_article_viewed_at_idx").on(table.articleId, table.viewedAt),
  ],
);

export const articleViewDailyStats = sqliteTable(
  "article_view_daily_stats",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    views: integer("views").default(0).notNull(),
    uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("article_view_daily_stats_article_day_unique").on(
      table.articleId,
      table.day,
    ),
    index("article_view_daily_stats_day_views_idx").on(table.day, table.views),
  ],
);

export const siteEvents = sqliteTable(
  "site_events",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    name: text("name", { length: 120 }).notNull(),
    payload: text("payload"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("site_events_name_created_at_idx").on(table.name, table.createdAt)],
);

export const articleViewsByDay = sql`
  SELECT article_id, date(viewed_at / 1000, 'unixepoch') AS day, count(*) AS views
  FROM article_views
  GROUP BY article_id, date(viewed_at / 1000, 'unixepoch')
`;

export type ArticleView = typeof articleViews.$inferSelect;
export type NewArticleView = typeof articleViews.$inferInsert;
export type ArticleViewDailyStat = typeof articleViewDailyStats.$inferSelect;
