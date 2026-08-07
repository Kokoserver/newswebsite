import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { articles } from "./articles";
import { users } from "./users";

export const commentStatus = pgEnum("comment_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SPAM",
  "DELETED",
]);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    parentId: uuid("parent_id"),
    authorName: varchar("author_name", { length: 160 }),
    authorEmail: varchar("author_email", { length: 320 }),
    body: text("body").notNull(),
    status: commentStatus("status").default("PENDING").notNull(),
    moderatedById: uuid("moderated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_article_status_created_at_idx").on(
      table.articleId,
      table.status,
      table.createdAt,
    ),
    index("comments_moderation_idx").on(table.status, table.createdAt),
    index("comments_user_id_idx").on(table.userId),
  ],
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_thread",
  }),
  replies: many(comments, { relationName: "comment_thread" }),
  reactions: many(commentReactions),
}));

export const commentReactionType = pgEnum("comment_reaction_type", [
  "LIKE",
  "DISLIKE",
]);

export const commentReactions = pgTable(
  "comment_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reactionType: commentReactionType("reaction_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("comment_reactions_comment_user_unique").on(
      table.commentId,
      table.userId,
    ),
    index("comment_reactions_comment_idx").on(table.commentId),
    index("comment_reactions_user_id_idx").on(table.userId),
  ],
);

export const commentReactionsRelations = relations(
  commentReactions,
  ({ one }) => ({
    comment: one(comments, {
      fields: [commentReactions.commentId],
      references: [comments.id],
    }),
    user: one(users, {
      fields: [commentReactions.userId],
      references: [users.id],
    }),
  }),
);

export type CommentReaction = typeof commentReactions.$inferSelect;
export type NewCommentReaction = typeof commentReactions.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
