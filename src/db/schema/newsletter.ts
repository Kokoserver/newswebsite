import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const newsletterSubscriberStatusValues = ["PENDING", "ACTIVE", "UNSUBSCRIBED", "BOUNCED"] as const;
export type NewsletterSubscriberStatus = (typeof newsletterSubscriberStatusValues)[number];
const newsletterSubscriberStatus = (name: string) => text(name, { enum: newsletterSubscriberStatusValues });

export const newsletterSubscribers = sqliteTable(
  "newsletter_subscribers",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    email: text("email", { length: 320 }).notNull(),
    status: newsletterSubscriberStatus("status").default("PENDING").notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
    unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
    index("newsletter_subscribers_status_idx").on(table.status),
  ],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
