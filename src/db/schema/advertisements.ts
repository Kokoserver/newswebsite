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

export const advertisementStatusValues = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED"] as const;
export type AdvertisementStatus = (typeof advertisementStatusValues)[number];
const advertisementStatus = (name: string) => text(name, { enum: advertisementStatusValues });

export const advertisementSlotValues = [
  "HOMEPAGE_TOP",
  "HOMEPAGE_MIDDLE",
  "ARTICLE_INLINE",
  "ARTICLE_SIDEBAR",
  "CATEGORY_TOP",
] as const;
export type AdvertisementSlot = (typeof advertisementSlotValues)[number];
const advertisementSlot = (name: string) => text(name, { enum: advertisementSlotValues });

export const advertisements = sqliteTable(
  "advertisements",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    name: text("name", { length: 200 }).notNull(),
    status: advertisementStatus("status").default("DRAFT").notNull(),
    targetUrl: text("target_url").notNull(),
    mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("advertisements_status_window_idx").on(
      table.status,
      table.startsAt,
      table.endsAt,
    ),
    check("advertisements_window_check", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const advertisementAssignments = sqliteTable(
  "advertisement_assignments",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    advertisementId: text("advertisement_id")
      .notNull()
      .references(() => advertisements.id, { onDelete: "cascade" }),
    slot: advertisementSlot("slot").notNull(),
    articleId: text("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    position: integer("position").default(1).notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("advertisement_assignments_unique").on(
      table.slot,
      table.articleId,
      table.position,
      table.startsAt,
    ),
    index("advertisement_assignments_slot_window_idx").on(
      table.slot,
      table.startsAt,
      table.endsAt,
    ),
    check("advertisement_assignments_position_positive", sql`${table.position} > 0`),
    check(
      "advertisement_assignments_window_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
  ],
);

export const advertisementsRelations = relations(advertisements, ({ one, many }) => ({
  media: one(media, {
    fields: [advertisements.mediaId],
    references: [media.id],
  }),
  assignments: many(advertisementAssignments),
}));

export type Advertisement = typeof advertisements.$inferSelect;
export type NewAdvertisement = typeof advertisements.$inferInsert;
export type AdvertisementAssignment = typeof advertisementAssignments.$inferSelect;
