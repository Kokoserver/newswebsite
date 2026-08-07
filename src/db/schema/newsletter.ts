import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const newsletterSubscriberStatus = pgEnum("newsletter_subscriber_status", [
  "PENDING",
  "ACTIVE",
  "UNSUBSCRIBED",
  "BOUNCED",
]);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    status: newsletterSubscriberStatus("status").default("PENDING").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
    index("newsletter_subscribers_status_idx").on(table.status),
  ],
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
