CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`displayName` text,
	`type` text,
	`url` text,
	`mimeType` text,
	`assignedTo` text,
	`json` text,
	`extra` text,
	`size` integer,
	`storageKey` text,
	`description` text,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`agentId` text,
	`sessionId` text PRIMARY KEY NOT NULL,
	`user` text,
	`result` text,
	`format` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finalizedAt` text,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `Attachments`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `result`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `prompt`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `safetyRules`;