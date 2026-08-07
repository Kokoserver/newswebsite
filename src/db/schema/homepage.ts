import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { media } from "./media";

export const homepageSectionKind = pgEnum("homepage_section_kind", [
  "HERO",
  "LATEST",
  "FEATURED",
  "CATEGORY",
  "OPINION",
  "VIDEO",
  "ADVERTISEMENT",
]);

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 80 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    kind: homepageSectionKind("kind").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("homepage_sections_key_unique").on(table.key),
    uniqueIndex("homepage_sections_position_unique").on(table.position),
    index("homepage_sections_position_idx").on(table.position),
    check("homepage_sections_position_positive", sql`${table.position} > 0`),
  ],
);

export const homepageItems = pgTable(
  "homepage_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => homepageSections.id, { onDelete: "cascade" }),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
    titleOverride: varchar("title_override", { length: 240 }),
    dekOverride: text("dek_override"),
    position: integer("position").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("homepage_items_section_position_unique").on(
      table.sectionId,
      table.position,
    ),
    uniqueIndex("homepage_items_section_article_unique").on(
      table.sectionId,
      table.articleId,
    ),
    index("homepage_items_section_position_idx").on(table.sectionId, table.position),
    check("homepage_items_position_positive", sql`${table.position} > 0`),
    check(
      "homepage_items_schedule_window_check",
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const homepageSectionsRelations = relations(
  homepageSections,
  ({ many }) => ({
    items: many(homepageItems),
  }),
);

export const homepageItemsRelations = relations(homepageItems, ({ one }) => ({
  section: one(homepageSections, {
    fields: [homepageItems.sectionId],
    references: [homepageSections.id],
  }),
  article: one(articles, {
    fields: [homepageItems.articleId],
    references: [articles.id],
  }),
  media: one(media, {
    fields: [homepageItems.mediaId],
    references: [media.id],
  }),
}));

export type HomepageSection = typeof homepageSections.$inferSelect;
export type NewHomepageSection = typeof homepageSections.$inferInsert;
export type HomepageItem = typeof homepageItems.$inferSelect;
export type NewHomepageItem = typeof homepageItems.$inferInsert;
