CREATE TABLE `Attachments` (
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
CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `keys` (
	`keyLocatorHash` text PRIMARY KEY NOT NULL,
	`displayName` text,
	`databaseIdHash` text NOT NULL,
	`keyHash` text NOT NULL,
	`keyHashParams` text NOT NULL,
	`encryptedMasterKey` text NOT NULL,
	`acl` text,
	`extra` text,
	`expiryDate` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text,
	`code` text,
	`key` text,
	`signature` text,
	`ip` text,
	`ua` text,
	`name` text,
	`email` text,
	`signedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
