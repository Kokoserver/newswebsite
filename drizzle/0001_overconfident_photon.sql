CREATE TABLE "navbar_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"href" varchar(240) NOT NULL,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "navbar_items_position_positive" CHECK ("navbar_items"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "navbar_items" ADD CONSTRAINT "navbar_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "navbar_items_category_id_unique" ON "navbar_items" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "navbar_items_position_unique" ON "navbar_items" USING btree ("position");--> statement-breakpoint
CREATE INDEX "navbar_items_active_position_idx" ON "navbar_items" USING btree ("is_active","position");