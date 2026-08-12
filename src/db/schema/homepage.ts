import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { articles } from "./articles";
import { media } from "./media";

export const homepageSectionKindValues = [
  "HERO",
  "LATEST",
  "FEATURED",
  "CATEGORY",
  "OPINION",
  "VIDEO",
  "ADVERTISEMENT",
] as const;
export type HomepageSectionKind = (typeof homepageSectionKindValues)[number];
const homepageSectionKind = (name: string) => text(name, { enum: homepageSectionKindValues });

export const homepageSections = sqliteTable(
  "homepage_sections",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    key: text("key", { length: 80 }).notNull(),
    title: text("title", { length: 180 }).notNull(),
    kind: homepageSectionKind("kind").notNull(),
    position: integer("position").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("homepage_sections_key_unique").on(table.key),
    uniqueIndex("homepage_sections_position_unique").on(table.position),
    index("homepage_sections_position_idx").on(table.position),
    check("homepage_sections_position_positive", sql`${table.position} > 0`),
  ],
);

export const homepageItems = sqliteTable(
  "homepage_items",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => homepageSections.id, { onDelete: "cascade" }),
    articleId: text("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
    titleOverride: text("title_override", { length: 240 }),
    dekOverride: text("dek_override"),
    position: integer("position").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }),
    endsAt: integer("ends_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
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
