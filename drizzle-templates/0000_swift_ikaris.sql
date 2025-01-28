CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`displayName` text,
	`options` text,
	`prompt` text NOT NULL,
	`expectedResult` text,
	`safetyRules` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
