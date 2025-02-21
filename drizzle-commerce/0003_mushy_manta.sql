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
