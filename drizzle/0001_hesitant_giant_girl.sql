CREATE TABLE `analysis_results` (
	`audit_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`mode` text NOT NULL,
	`summary` text NOT NULL,
	`findings_json` text NOT NULL,
	`questions_json` text NOT NULL,
	`extraction_warnings_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_results_owner` ON `analysis_results` (`owner_id`);--> statement-breakpoint
CREATE TABLE `source_fragments` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_title` text NOT NULL,
	`source_location` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_source_fragments_audit` ON `source_fragments` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_source_fragments_owner` ON `source_fragments` (`owner_id`);
--> statement-breakpoint
PRAGMA optimize;
