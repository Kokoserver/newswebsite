CREATE INDEX "articles_status_view_count_idx" ON "articles" USING btree ("status","view_count");--> statement-breakpoint
CREATE INDEX "comment_reactions_user_id_idx" ON "comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_user_id_idx" ON "comments" USING btree ("user_id");