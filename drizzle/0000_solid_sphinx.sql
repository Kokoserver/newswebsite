CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."article_type" AS ENUM('STANDARD', 'BREAKING', 'LIVE_BLOG', 'OPINION', 'ANALYSIS', 'INTERVIEW', 'VIDEO', 'GALLERY', 'REVIEW', 'EXPLAINER', 'SPONSORED');--> statement-breakpoint
CREATE TYPE "public"."homepage_section_kind" AS ENUM('HERO', 'LATEST', 'FEATURED', 'CATEGORY', 'OPINION', 'VIDEO', 'ADVERTISEMENT');--> statement-breakpoint
CREATE TYPE "public"."newsletter_subscriber_status" AS ENUM('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SPAM', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."advertisement_slot" AS ENUM('HOMEPAGE_TOP', 'HOMEPAGE_MIDDLE', 'ARTICLE_INLINE', 'ARTICLE_SIDEBAR', 'CATEGORY_TOP');--> statement-breakpoint
CREATE TYPE "public"."advertisement_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'LOGIN', 'LOGOUT');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "authenticators" (
	"credential_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"credential_device_type" varchar(255) NOT NULL,
	"credential_backed_up" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticators_user_id_credential_id_pk" PRIMARY KEY("user_id","credential_id"),
	CONSTRAINT "authenticators_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200),
	"email" varchar(320) NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'AUTHOR' NOT NULL,
	"status" "user_status" DEFAULT 'INVITED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(320) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "media_kind" DEFAULT 'IMAGE' NOT NULL,
	"title" varchar(240),
	"alt_text" varchar(320),
	"caption" text,
	"bunny_path" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" bigint NOT NULL,
	"width" bigint,
	"height" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "article_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"editor_id" uuid,
	"title" varchar(300) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(320) NOT NULL,
	"subtitle" text,
	"excerpt" text,
	"content" jsonb NOT NULL,
	"rendered_content" text,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"type" "article_type" DEFAULT 'STANDARD' NOT NULL,
	"author_id" uuid NOT NULL,
	"hero_image_id" uuid,
	"mobile_hero_image_id" uuid,
	"social_image_id" uuid,
	"seo_title" varchar(70),
	"seo_description" varchar(170),
	"canonical_url" text,
	"source_name" varchar(200),
	"source_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "articles_publication_dates_check" CHECK (("articles"."status" <> 'PUBLISHED' OR "articles"."published_at" IS NOT NULL)
        AND ("articles"."status" <> 'SCHEDULED' OR "articles"."scheduled_at" IS NOT NULL)),
	CONSTRAINT "articles_reading_minutes_positive" CHECK ("articles"."reading_minutes" > 0),
	CONSTRAINT "articles_view_count_non_negative" CHECK ("articles"."view_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"article_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "article_categories_article_id_category_id_pk" PRIMARY KEY("article_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"article_id" uuid,
	"media_id" uuid,
	"title_override" varchar(240),
	"dek_override" text,
	"position" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_items_position_positive" CHECK ("homepage_items"."position" > 0),
	CONSTRAINT "homepage_items_schedule_window_check" CHECK ("homepage_items"."ends_at" IS NULL OR "homepage_items"."starts_at" IS NULL OR "homepage_items"."ends_at" > "homepage_items"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"title" varchar(180) NOT NULL,
	"kind" "homepage_section_kind" NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_sections_position_positive" CHECK ("homepage_sections"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "newsletter_subscriber_status" DEFAULT 'PENDING' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid,
	"parent_id" uuid,
	"author_name" varchar(160),
	"author_email" varchar(320),
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'PENDING' NOT NULL,
	"moderated_by_id" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "advertisement_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertisement_id" uuid NOT NULL,
	"slot" "advertisement_slot" NOT NULL,
	"article_id" uuid,
	"position" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	CONSTRAINT "advertisement_assignments_position_positive" CHECK ("advertisement_assignments"."position" > 0),
	CONSTRAINT "advertisement_assignments_window_check" CHECK ("advertisement_assignments"."ends_at" > "advertisement_assignments"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" "advertisement_status" DEFAULT 'DRAFT' NOT NULL,
	"target_url" text NOT NULL,
	"media_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advertisements_window_check" CHECK ("advertisements"."ends_at" > "advertisements"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "article_view_daily_stats" (
	"article_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"visitor_hash" varchar(128),
	"referrer" text,
	"user_agent" text,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"article_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" uuid,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_mobile_hero_image_id_media_id_fk" FOREIGN KEY ("mobile_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_social_image_id_media_id_fk" FOREIGN KEY ("social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_items" ADD CONSTRAINT "homepage_items_section_id_homepage_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."homepage_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_items" ADD CONSTRAINT "homepage_items_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_items" ADD CONSTRAINT "homepage_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_id_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisement_assignments" ADD CONSTRAINT "advertisement_assignments_advertisement_id_advertisements_id_fk" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisement_assignments" ADD CONSTRAINT "advertisement_assignments_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_view_daily_stats" ADD CONSTRAINT "article_view_daily_stats_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_views" ADD CONSTRAINT "article_views_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_unique" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "media_kind_created_at_idx" ON "media" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_id_idx" ON "media" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "article_revisions_article_id_created_at_idx" ON "article_revisions" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_type_published_at_idx" ON "articles" USING btree ("type","published_at");--> statement-breakpoint
CREATE INDEX "articles_author_id_idx" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "articles_scheduled_at_idx" ON "articles" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "article_categories_category_id_idx" ON "article_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "article_categories_article_id_idx" ON "article_categories" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_position_idx" ON "categories" USING btree ("parent_id","position");--> statement-breakpoint
CREATE INDEX "article_tags_article_id_idx" ON "article_tags" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_tags_tag_id_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_items_section_position_unique" ON "homepage_items" USING btree ("section_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_items_section_article_unique" ON "homepage_items" USING btree ("section_id","article_id");--> statement-breakpoint
CREATE INDEX "homepage_items_section_position_idx" ON "homepage_items" USING btree ("section_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_sections_key_unique" ON "homepage_sections" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_sections_position_unique" ON "homepage_sections" USING btree ("position");--> statement-breakpoint
CREATE INDEX "homepage_sections_position_idx" ON "homepage_sections" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_article_status_created_at_idx" ON "comments" USING btree ("article_id","status","created_at");--> statement-breakpoint
CREATE INDEX "comments_moderation_idx" ON "comments" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "advertisement_assignments_unique" ON "advertisement_assignments" USING btree ("slot","article_id","position","starts_at");--> statement-breakpoint
CREATE INDEX "advertisement_assignments_slot_window_idx" ON "advertisement_assignments" USING btree ("slot","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "advertisements_status_window_idx" ON "advertisements" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "article_view_daily_stats_article_day_unique" ON "article_view_daily_stats" USING btree ("article_id","day");--> statement-breakpoint
CREATE INDEX "article_view_daily_stats_day_views_idx" ON "article_view_daily_stats" USING btree ("day","views");--> statement-breakpoint
CREATE INDEX "article_views_article_viewed_at_idx" ON "article_views" USING btree ("article_id","viewed_at");--> statement-breakpoint
CREATE INDEX "site_events_name_created_at_idx" ON "site_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");