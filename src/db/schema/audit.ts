import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { articles } from "./articles";
import { users } from "./users";

export const auditActionValues = ["CREATE", "UPDATE", "DELETE", "PUBLISH", "UNPUBLISH", "LOGIN", "LOGOUT"] as const;
export type AuditAction = (typeof auditActionValues)[number];
const auditAction = (name: string) => text(name, { enum: auditActionValues });

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    articleId: text("article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    action: auditAction("action").notNull(),
    entityType: text("entity_type", { length: 120 }).notNull(),
    entityId: text("entity_id"),
    summary: text("summary"),
    metadata: text("metadata", { mode: "json" }).default({}).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("audit_logs_actor_created_at_idx").on(table.actorId, table.createdAt),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
