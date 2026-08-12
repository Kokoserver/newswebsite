import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const mediaKindValues = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] as const;
export type MediaKind = (typeof mediaKindValues)[number];
const mediaKind = (name: string) => text(name, { enum: mediaKindValues });

export const media = sqliteTable(
  "media",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    kind: mediaKind("kind").default("IMAGE").notNull(),
    title: text("title", { length: 240 }),
    slug: text("slug", { length: 320 }),
    altText: text("alt_text", { length: 320 }),
    caption: text("caption"),
    posterUrl: text("poster_url"),
    bunnyPath: text("bunny_path").notNull(),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type", { length: 120 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    metadata: text("metadata", { mode: "json" }).default({}).notNull(),
    uploadedById: text("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
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
