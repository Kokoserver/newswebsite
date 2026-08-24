CREATE TABLE `newsletter_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text(160) NOT NULL,
	`preview_text` text(240),
	`content` text NOT NULL,
	`article_url` text,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`delivered_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`created_by_id` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`sent_at` integer,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `newsletter_campaigns_status_created_at_idx` ON `newsletter_campaigns` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `newsletter_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`subscriber_id` text,
	`email` text(320) NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `newsletter_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscriber_id`) REFERENCES `newsletter_subscribers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_deliveries_campaign_email_unique` ON `newsletter_deliveries` (`campaign_id`,`email`);--> statement-breakpoint
CREATE INDEX `newsletter_deliveries_campaign_status_idx` ON `newsletter_deliveries` (`campaign_id`,`status`);