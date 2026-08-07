import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { articles } from "./articles";

export const articleViews = pgTable(
  "article_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    visitorHash: varchar("visitor_hash", { length: 128 }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("article_views_article_viewed_at_idx").on(table.articleId, table.viewedAt),
  ],
);

export const articleViewDailyStats = pgTable(
  "article_view_daily_stats",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: bigint("views", { mode: "number" }).default(0).notNull(),
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

export const siteEvents = pgTable(
  "site_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    payload: text("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("site_events_name_created_at_idx").on(table.name, table.createdAt)],
);

export const articleViewsByDay = sql`
  SELECT article_id, date_trunc('day', viewed_at) AS day, count(*) AS views
  FROM article_views
  GROUP BY article_id, date_trunc('day', viewed_at)
`;

export type ArticleView = typeof articleViews.$inferSelect;
export type NewArticleView = typeof articleViews.$inferInsert;
export type ArticleViewDailyStat = typeof articleViewDailyStats.$inferSelect;
