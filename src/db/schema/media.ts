import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const mediaKind = pgEnum("media_kind", [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
]);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: mediaKind("kind").default("IMAGE").notNull(),
    title: varchar("title", { length: 240 }),
    slug: varchar("slug", { length: 320 }),
    altText: varchar("alt_text", { length: 320 }),
    caption: text("caption"),
    posterUrl: text("poster_url"),
    bunnyPath: text("bunny_path").notNull(),
    publicUrl: text("public_url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    width: bigint("width", { mode: "number" }),
    height: bigint("height", { mode: "number" }),
    metadata: jsonb("metadata").default({}).notNull(),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("media_slug_unique").on(table.slug),
    index("media_kind_created_at_idx").on(table.kind, table.createdAt),
    index("media_uploaded_by_id_idx").on(table.uploadedById),
  ],
);

export const mediaRelations = relations(media, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [media.uploadedById],
    references: [users.id],
  }),
}));

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
