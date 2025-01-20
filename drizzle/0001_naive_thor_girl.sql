CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`displayName` text,
	`options` text,
	`prompt` text NOT NULL,
	`safetyRules` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text,
	`user` text,
	`messages` text,
	`result` text,
	`prompt` text NOT NULL,
	`safetyRules` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finalizedAt` text,
	FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
