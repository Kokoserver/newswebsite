ALTER TABLE "media" ADD COLUMN "slug" varchar(320);--> statement-breakpoint
CREATE UNIQUE INDEX "media_slug_unique" ON "media" USING btree ("slug");