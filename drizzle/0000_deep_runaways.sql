CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`provider_account_id` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `authenticators` (
	`credential_id` text(255) NOT NULL,
	`user_id` text NOT NULL,
	`provider_account_id` text(255) NOT NULL,
	`credential_public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`credential_device_type` text(255) NOT NULL,
	`credential_backed_up` integer NOT NULL,
	`transports` text,
	PRIMARY KEY(`user_id`, `credential_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authenticators_credential_id_unique` ON `authenticators` (`credential_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text(64) NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text(255) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(200),
	`email` text(320) NOT NULL,
	`email_verified` integer,
	`image` text,
	`password_hash` text,
	`role` text DEFAULT 'AUTHOR' NOT NULL,
	`status` text DEFAULT 'INVITED' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text(320) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'IMAGE' NOT NULL,
	`title` text(240),
	`slug` text(320),
	`alt_text` text(320),
	`caption` text,
	`poster_url` text,
	`bunny_path` text NOT NULL,
	`public_url` text NOT NULL,
	`mime_type` text(120) NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`metadata` text DEFAULT '{}' NOT NULL,
	`uploaded_by_id` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_slug_unique` ON `media` (`slug`);--> statement-breakpoint
CREATE INDEX `media_kind_created_at_idx` ON `media` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_uploaded_by_id_idx` ON `media` (`uploaded_by_id`);--> statement-breakpoint
CREATE TABLE `article_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`editor_id` text,
	`title` text(300) NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `article_revisions_article_id_created_at_idx` ON `article_revisions` (`article_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text(300) NOT NULL,
	`slug` text(320) NOT NULL,
	`subtitle` text,
	`excerpt` text,
	`content` text NOT NULL,
	`rendered_content` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`type` text DEFAULT 'STANDARD' NOT NULL,
	`author_id` text NOT NULL,
	`hero_image_id` text,
	`hero_video_id` text,
	`mobile_hero_image_id` text,
	`social_image_id` text,
	`seo_title` text(70),
	`seo_description` text(170),
	`canonical_url` text,
	`source_name` text(200),
	`source_url` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`allow_comments` integer DEFAULT true NOT NULL,
	`reading_minutes` integer DEFAULT 1 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`scheduled_at` integer,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`hero_image_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`hero_video_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mobile_hero_image_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`social_image_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "articles_publication_dates_check" CHECK(("articles"."status" <> 'PUBLISHED' OR "articles"."published_at" IS NOT NULL)
        AND ("articles"."status" <> 'SCHEDULED' OR "articles"."scheduled_at" IS NOT NULL)),
	CONSTRAINT "articles_reading_minutes_positive" CHECK("articles"."reading_minutes" > 0),
	CONSTRAINT "articles_view_count_non_negative" CHECK("articles"."view_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_slug_idx` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_idx` ON `articles` (`status`);--> statement-breakpoint
CREATE INDEX `articles_published_at_idx` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `articles_status_published_at_idx` ON `articles` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_status_view_count_idx` ON `articles` (`status`,`view_count`);--> statement-breakpoint
CREATE INDEX `articles_type_published_at_idx` ON `articles` (`type`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_author_id_idx` ON `articles` (`author_id`);--> statement-breakpoint
CREATE INDEX `articles_scheduled_at_idx` ON `articles` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `article_categories` (
	`article_id` text NOT NULL,
	`category_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`article_id`, `category_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `article_categories_category_id_idx` ON `article_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `article_categories_article_id_idx` ON `article_categories` (`article_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(160) NOT NULL,
	`slug` text(180) NOT NULL,
	`description` text,
	`parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_parent_position_idx` ON `categories` (`parent_id`,`position`);--> statement-breakpoint
CREATE TABLE `navbar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`label` text(120) NOT NULL,
	`href` text(240) NOT NULL,
	`position` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "navbar_items_position_positive" CHECK("navbar_items"."position" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `navbar_items_category_id_unique` ON `navbar_items` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `navbar_items_position_unique` ON `navbar_items` (`position`);--> statement-breakpoint
CREATE INDEX `navbar_items_active_position_idx` ON `navbar_items` (`is_active`,`position`);--> statement-breakpoint
CREATE TABLE `article_tags` (
	`article_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_tags_article_id_idx` ON `article_tags` (`article_id`);--> statement-breakpoint
CREATE INDEX `article_tags_tag_id_idx` ON `article_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(100) NOT NULL,
	`slug` text(120) NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `homepage_items` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`article_id` text,
	`media_id` text,
	`title_override` text(240),
	`dek_override` text,
	`position` integer NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `homepage_sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "homepage_items_position_positive" CHECK("homepage_items"."position" > 0),
	CONSTRAINT "homepage_items_schedule_window_check" CHECK("homepage_items"."ends_at" IS NULL OR "homepage_items"."starts_at" IS NULL OR "homepage_items"."ends_at" > "homepage_items"."starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homepage_items_section_position_unique` ON `homepage_items` (`section_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `homepage_items_section_article_unique` ON `homepage_items` (`section_id`,`article_id`);--> statement-breakpoint
CREATE INDEX `homepage_items_section_position_idx` ON `homepage_items` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `homepage_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text(80) NOT NULL,
	`title` text(180) NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "homepage_sections_position_positive" CHECK("homepage_sections"."position" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `homepage_sections_key_unique` ON `homepage_sections` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `homepage_sections_position_unique` ON `homepage_sections` (`position`);--> statement-breakpoint
CREATE INDEX `homepage_sections_position_idx` ON `homepage_sections` (`position`);--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text(320) NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`confirmed_at` integer,
	`unsubscribed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE INDEX `newsletter_subscribers_status_idx` ON `newsletter_subscribers` (`status`);--> statement-breakpoint
CREATE TABLE `comment_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reactions_comment_user_unique` ON `comment_reactions` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `comment_reactions_comment_idx` ON `comment_reactions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `comment_reactions_user_id_idx` ON `comment_reactions` (`user_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`user_id` text,
	`parent_id` text,
	`author_name` text(160),
	`author_email` text(320),
	`body` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`moderated_by_id` text,
	`moderated_at` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`moderated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comments_article_status_created_at_idx` ON `comments` (`article_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_moderation_idx` ON `comments` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_user_id_idx` ON `comments` (`user_id`);--> statement-breakpoint
CREATE TABLE `advertisement_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`advertisement_id` text NOT NULL,
	`slot` text NOT NULL,
	`article_id` text,
	`position` integer DEFAULT 1 NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "advertisement_assignments_position_positive" CHECK("advertisement_assignments"."position" > 0),
	CONSTRAINT "advertisement_assignments_window_check" CHECK("advertisement_assignments"."ends_at" > "advertisement_assignments"."starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `advertisement_assignments_unique` ON `advertisement_assignments` (`slot`,`article_id`,`position`,`starts_at`);--> statement-breakpoint
CREATE INDEX `advertisement_assignments_slot_window_idx` ON `advertisement_assignments` (`slot`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `advertisements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(200) NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`target_url` text NOT NULL,
	`media_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "advertisements_window_check" CHECK("advertisements"."ends_at" > "advertisements"."starts_at")
);
--> statement-breakpoint
CREATE INDEX `advertisements_status_window_idx` ON `advertisements` (`status`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `article_view_daily_stats` (
	`article_id` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`unique_visitors` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_view_daily_stats_article_day_unique` ON `article_view_daily_stats` (`article_id`,`day`);--> statement-breakpoint
CREATE INDEX `article_view_daily_stats_day_views_idx` ON `article_view_daily_stats` (`day`,`views`);--> statement-breakpoint
CREATE TABLE `article_views` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`visitor_hash` text(128),
	`referrer` text,
	`user_agent` text,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_views_article_viewed_at_idx` ON `article_views` (`article_id`,`viewed_at`);--> statement-breakpoint
CREATE TABLE `site_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(120) NOT NULL,
	`payload` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_events_name_created_at_idx` ON `site_events` (`name`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`article_id` text,
	`action` text NOT NULL,
	`entity_type` text(120) NOT NULL,
	`entity_id` text,
	`summary` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_at_idx` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);