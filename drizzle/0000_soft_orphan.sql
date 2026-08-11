CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`vendor_name` text NOT NULL,
	`product_url` text,
	`product_description` text,
	`intended_use` text,
	`data_sensitivity` text,
	`decision_impact` text,
	`assumptions` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audits_owner_updated` ON `audits` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_audits_expires_at` ON `audits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`original_file_name` text,
	`storage_key` text,
	`content_type` text,
	`size_bytes` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sources_audit` ON `sources` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_sources_owner` ON `sources` (`owner_id`);