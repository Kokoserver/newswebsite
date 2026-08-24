import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./users";

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
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
    index("newsletter_subscribers_status_idx").on(table.status),
  ],
);

export const newsletterCampaignStatusValues = ["QUEUED", "SENDING", "SENT", "PARTIAL", "FAILED"] as const;
export type NewsletterCampaignStatus = (typeof newsletterCampaignStatusValues)[number];
const newsletterCampaignStatus = (name: string) => text(name, { enum: newsletterCampaignStatusValues });

export const newsletterCampaigns = sqliteTable(
  "newsletter_campaigns",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    subject: text("subject", { length: 160 }).notNull(),
    previewText: text("preview_text", { length: 240 }),
    content: text("content").notNull(),
    articleUrl: text("article_url"),
    status: newsletterCampaignStatus("status").default("QUEUED").notNull(),
    recipientCount: integer("recipient_count").default(0).notNull(),
    deliveredCount: integer("delivered_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    errorSummary: text("error_summary"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }),
    sentAt: integer("sent_at", { mode: "timestamp" }),
  },
  (table) => [index("newsletter_campaigns_status_created_at_idx").on(table.status, table.createdAt)],
);

export const newsletterDeliveryStatusValues = ["SENT", "FAILED"] as const;
export type NewsletterDeliveryStatus = (typeof newsletterDeliveryStatusValues)[number];
const newsletterDeliveryStatus = (name: string) => text(name, { enum: newsletterDeliveryStatusValues });

export const newsletterDeliveries = sqliteTable(
  "newsletter_deliveries",
  {
    id: text("id").$defaultFn(() => crypto.randomUUID()).primaryKey(),
    campaignId: text("campaign_id").notNull().references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
    subscriberId: text("subscriber_id").references(() => newsletterSubscribers.id, { onDelete: "set null" }),
    email: text("email", { length: 320 }).notNull(),
    status: newsletterDeliveryStatus("status").notNull(),
    error: text("error"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_deliveries_campaign_email_unique").on(table.campaignId, table.email),
    index("newsletter_deliveries_campaign_status_idx").on(table.campaignId, table.status),
  ],
);

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({ one, many }) => ({
  createdBy: one(users, { fields: [newsletterCampaigns.createdById], references: [users.id] }),
  deliveries: many(newsletterDeliveries),
}));

export const newsletterDeliveriesRelations = relations(newsletterDeliveries, ({ one }) => ({
  campaign: one(newsletterCampaigns, { fields: [newsletterDeliveries.campaignId], references: [newsletterCampaigns.id] }),
  subscriber: one(newsletterSubscribers, { fields: [newsletterDeliveries.subscriberId], references: [newsletterSubscribers.id] }),
}));

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
export type NewNewsletterCampaign = typeof newsletterCampaigns.$inferInsert;
export type NewsletterDelivery = typeof newsletterDeliveries.$inferSelect;
