import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { articles } from "./articles";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    name: text("name", { length: 160 }).notNull(),
    slug: text("slug", { length: 180 }).notNull(),
    description: text("description"),
    parentId: text("parent_id"),
    position: integer("position").default(0).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_position_idx").on(table.parentId, table.position),
  ],
);

export const articleCategories = sqliteTable(
  "article_categories",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(false).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.articleId, table.categoryId],
      name: "article_categories_article_id_category_id_pk",
    }),
    index("article_categories_category_id_idx").on(table.categoryId),
    index("article_categories_article_id_idx").on(table.articleId),
  ],
);

export const navbarItems = sqliteTable(
  "navbar_items",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    label: text("label", { length: 120 }).notNull(),
    href: text("href", { length: 240 }).notNull(),
    position: integer("position").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("navbar_items_category_id_unique").on(table.categoryId),
    uniqueIndex("navbar_items_position_unique").on(table.position),
    index("navbar_items_active_position_idx").on(table.isActive, table.position),
    check("navbar_items_position_positive", sql`${table.position} > 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_tree",
  }),
  children: many(categories, { relationName: "category_tree" }),
  articleCategories: many(articleCategories),
  navbarItem: one(navbarItems, {
    fields: [categories.id],
    references: [navbarItems.categoryId],
  }),
}));

export const articleCategoriesRelations = relations(
  articleCategories,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleCategories.articleId],
      references: [articles.id],
    }),
    category: one(categories, {
      fields: [articleCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const navbarItemsRelations = relations(navbarItems, ({ one }) => ({
  category: one(categories, {
    fields: [navbarItems.categoryId],
    references: [categories.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type ArticleCategory = typeof articleCategories.$inferSelect;
export type NavbarItem = typeof navbarItems.$inferSelect;
export type NewNavbarItem = typeof navbarItems.$inferInsert;
