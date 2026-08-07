import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { users } from "./users";

export const auditAction = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "PUBLISH",
  "UNPUBLISH",
  "LOGIN",
  "LOGOUT",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    action: auditAction("action").notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    summary: text("summary"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_actor_created_at_idx").on(table.actorId, table.createdAt),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
