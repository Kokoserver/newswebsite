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

export const advertisementStatus = pgEnum("advertisement_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
]);

export const advertisementSlot = pgEnum("advertisement_slot", [
  "HOMEPAGE_TOP",
  "HOMEPAGE_MIDDLE",
  "ARTICLE_INLINE",
  "ARTICLE_SIDEBAR",
  "CATEGORY_TOP",
]);

export const advertisements = pgTable(
  "advertisements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    status: advertisementStatus("status").default("DRAFT").notNull(),
    targetUrl: text("target_url").notNull(),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
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

export const advertisementAssignments = pgTable(
  "advertisement_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    advertisementId: uuid("advertisement_id")
      .notNull()
      .references(() => advertisements.id, { onDelete: "cascade" }),
    slot: advertisementSlot("slot").notNull(),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    position: integer("position").default(1).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
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
