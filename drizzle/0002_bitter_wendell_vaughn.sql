CREATE TABLE `advertisement_media` (
	`id` text PRIMARY KEY NOT NULL,
	`advertisement_id` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `advertisement_media_position_unique` ON `advertisement_media` (`advertisement_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `advertisement_media_media_unique` ON `advertisement_media` (`advertisement_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `advertisement_media_media_idx` ON `advertisement_media` (`media_id`);