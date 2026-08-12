import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { articles } from "./articles";
import { users } from "./users";

export const commentStatusValues = ["PENDING", "APPROVED", "REJECTED", "SPAM", "DELETED"] as const;
export type CommentStatus = (typeof commentStatusValues)[number];
const commentStatus = (name: string) => text(name, { enum: commentStatusValues });

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    parentId: text("parent_id"),
    authorName: text("author_name", { length: 160 }),
    authorEmail: text("author_email", { length: 320 }),
    body: text("body").notNull(),
    status: commentStatus("status").default("PENDING").notNull(),
    moderatedById: text("moderated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedAt: integer("moderated_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
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

export const commentReactionTypeValues = ["LIKE", "DISLIKE"] as const;
export type CommentReactionType = (typeof commentReactionTypeValues)[number];
const commentReactionType = (name: string) => text(name, { enum: commentReactionTypeValues });

export const commentReactions = sqliteTable(
  "comment_reactions",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reactionType: commentReactionType("reaction_type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
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
