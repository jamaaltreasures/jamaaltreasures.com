CREATE TABLE `site_listen_events` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`threshold_seconds` integer NOT NULL,
	`counted_at` integer
);
--> statement-breakpoint
CREATE TABLE `site_listen_totals` (
	`track_id` text PRIMARY KEY NOT NULL,
	`listens` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
